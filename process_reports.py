import csv
import os
import re

class Ad:
    def __init__(self, name, status, spend):
        self.name = name
        self.status = status
        self.spend = spend

class AdSet:
    def __init__(self, name, status, spend):
        self.name = name
        self.status = status
        self.spend = spend
        self.ads = []

class Campaign:
    def __init__(self, name, status, spend):
        self.name = name
        self.status = status
        self.spend = spend
        self.ad_sets = []

def normalize_name(name):
    name = name.lower()
    name = re.sub(r'\[.*?\]', '', name)  # Remove anything in brackets
    name = name.replace('|', ' ').replace('_', ' ').replace('-', ' ')
    # Remove extra spaces
    name = ' '.join(name.split())
    return name

def get_id_from_name(name, prefix):
    """Extracts an ID like CP01 or CJ01 from a name."""
    name = name.upper()
    # Find patterns like CP01, CJE01, etc.
    match = re.search(fr'({prefix}E?\d+)', name)
    if match:
        return match.group(1)
    return None

def has_activity(row, metric_indices):
    """Check if any metric indicates activity."""
    for idx in metric_indices:
        try:
            if idx >= len(row):
                continue
            value_str = row[idx].replace(',', '.') if row[idx] else '0'
            if float(value_str) > 0:
                return True
        except (ValueError, IndexError):
            continue
    return False

def parse_csv(file_path, data_type, ad_sets_map=None):
    items = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            header = next(reader)

            name_col, status_col, spend_col, ad_set_name_col = -1, -1, -1, -1

            metric_cols = [
                "Valor usado (BRL)", "Resultados", "Alcance",
                "Impressões", "Cliques no link", "Visitas ao perfil do Instagram"
            ]
            metric_indices = [header.index(col) for col in metric_cols if col in header]

            if data_type == 'campaign':
                name_col = header.index("Nome da campanha")
                status_col = header.index("Veiculação da campanha")
                spend_col = header.index("Valor usado (BRL)")
            elif data_type == 'ad_set':
                name_col = header.index("Nome do conjunto de anúncios")
                status_col = header.index("Veiculação do conjunto de anúncios")
                spend_col = header.index("Valor usado (BRL)")
            elif data_type == 'ad':
                name_col = header.index("Nome do anúncio")
                status_col = header.index("Veiculação do anúncio")
                spend_col = header.index("Valor usado (BRL)")
                ad_set_name_col = header.index("Nome do conjunto de anúncios")

            for row in reader:
                try:
                    if has_activity(row, metric_indices):
                        spend_str = row[spend_col].replace(',', '.') if row[spend_col] else '0.0'
                        spend = float(spend_str)
                        name = row[name_col]
                        status = row[status_col]
                        if data_type == 'campaign':
                            items.append(Campaign(name, status, spend))
                        elif data_type == 'ad_set':
                            ad_set = AdSet(name, status, spend)
                            items.append(ad_set)
                            if ad_sets_map is not None:
                                ad_sets_map[name] = ad_set
                        elif data_type == 'ad':
                            ad = Ad(name, status, spend)
                            ad_set_name = row[ad_set_name_col]
                            if ad_sets_map and ad_set_name in ad_sets_map:
                                ad_sets_map[ad_set_name].ads.append(ad)
                except (ValueError, IndexError):
                    continue
    except FileNotFoundError:
        print(f"Arquivo não encontrado: {file_path}")
    except Exception as e:
        print(f"Erro ao processar o arquivo {file_path}: {e}")
        
    return items

def main():
    base_path = 'relatorios-sun_motors'
    brands = ['Haojue', 'Kia', 'Suzuki', 'Zontes']
    output_lines = []

    for brand in brands:
        all_campaigns = []
        all_ad_sets = []
        ad_sets_map = {}

        file_list = os.listdir(base_path)

        campaign_files = [f for f in file_list if brand in f and 'Campanhas' in f and f.endswith('.csv')]
        ad_set_files = [f for f in file_list if brand in f and 'Conjuntos' in f and f.endswith('.csv')]
        ad_files = [f for f in file_list if brand in f and 'Anúncios' in f and f.endswith('.csv')]

        for f in ad_set_files:
            ad_sets = parse_csv(os.path.join(base_path, f), 'ad_set', ad_sets_map)
            all_ad_sets.extend(ad_sets)

        for f in ad_files:
            parse_csv(os.path.join(base_path, f), 'ad', ad_sets_map)
            
        for f in campaign_files:
            campaigns = parse_csv(os.path.join(base_path, f), 'campaign')
            all_campaigns.extend(campaigns)

        # Remove duplicate campaigns by name
        unique_campaigns = {c.name: c for c in all_campaigns}.values()
        campaign_ad_sets = {c.name: [] for c in unique_campaigns}

        # First pass: Match by explicit IDs (e.g., CP01 campaign with CJ01 ad set)
        unmatched_ad_sets = []
        for ad_set in all_ad_sets:
            ad_set_id = get_id_from_name(ad_set.name, 'CJ')
            matched = False
            if ad_set_id:
                for campaign in unique_campaigns:
                    campaign_id = get_id_from_name(campaign.name, 'CP')
                    if campaign_id and campaign_id.replace('CP', 'CJ') == ad_set_id:
                        campaign_ad_sets[campaign.name].append(ad_set)
                        matched = True
                        break
            if not matched:
                unmatched_ad_sets.append(ad_set)

        # Second pass: Match remaining ad sets by name similarity
        for ad_set in unmatched_ad_sets:
            norm_ad_set_name_words = set(normalize_name(ad_set.name).split())
            best_match_campaign = None
            max_score = 0
            
            for campaign in unique_campaigns:
                norm_campaign_name_words = set(normalize_name(campaign.name).split())
                
                meaningful_campaign_words = {w for w in norm_campaign_name_words if len(w) > 3}
                if not meaningful_campaign_words:
                    meaningful_campaign_words = norm_campaign_name_words

                common_words = norm_ad_set_name_words.intersection(meaningful_campaign_words)
                score = len(common_words)

                # Give a boost to campaigns that share at least one specific, long word
                if score > 0:
                    long_words_in_common = {w for w in common_words if len(w) > 4}
                    if long_words_in_common:
                        score += len(long_words_in_common) * 2

                if score > max_score:
                    max_score = score
                    best_match_campaign = campaign
            
            if best_match_campaign:
                campaign_ad_sets[best_match_campaign.name].append(ad_set)

        for campaign in unique_campaigns:
            # Sort ad sets to keep them grouped if they belong to the same campaign
            ad_sets = sorted(campaign_ad_sets.get(campaign.name, []), key=lambda x: x.name)
            if not ad_sets:
                continue

            output_lines.append("=======================================================================")
            output_lines.append(f"Campanha: {campaign.name} (Status: {campaign.status})")
            for ad_set in ad_sets:
                output_lines.append(f"  - Conjunto de Anúncios: {ad_set.name} (Status: {ad_set.status})")
                # Sort ads for consistent output
                sorted_ads = sorted(ad_set.ads, key=lambda x: x.name)
                for ad in sorted_ads:
                    output_lines.append(f"    - Anúncio: {ad.name} (Status: {ad.status})")
            output_lines.append("=======================================================================")
            output_lines.append("")

    with open('campanhas_a_criar.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))

    print("Arquivo 'campanhas_a_criar.txt' gerado com sucesso.")

if __name__ == "__main__":
    main()
