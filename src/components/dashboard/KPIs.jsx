import React from 'react';
import { DollarSign, Eye, MousePointer, Target, TrendingUp, Calculator, ArrowUp, ArrowDown } from 'lucide-react';

const KPIs = ({ performanceData }) => {
    const calculateTotals = (data) => {
        if (!data) return { custo: 0, impressoes: 0, cliques: 0, conversoes: 0 };
        return data.reduce((acc, report) => {
            acc.custo += report.custo || 0;
            acc.impressoes += report.impressoes || 0;
            acc.cliques += report.cliques || 0;
            acc.conversoes += report.conversoes || 0;
            return acc;
        }, { custo: 0, impressoes: 0, cliques: 0, conversoes: 0 });
    };

    const totals = calculateTotals(performanceData);

    // Derived metrics
    const ctr = totals.impressoes > 0 ? (totals.cliques / totals.impressoes) * 100 : 0;
    const cpc = totals.cliques > 0 ? totals.custo / totals.cliques : 0;

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatNumber = (val) => new Intl.NumberFormat('pt-BR').format(val);
    const formatPercentage = (val) => `${val.toFixed(2)}%`;

    const KPICard = ({ title, icon: Icon, value, change }) => (
        <div className="kpi-card">
            <div className="kpi-header">
                <h3>{title}</h3>
                <Icon />
            </div>
            <div className="kpi-value">{value}</div>
            {/* Change indicator placeholder - would need previous period data */}
            <div className="kpi-change neutral">Sem dados anteriores</div>
        </div>
    );

    return (
        <div className="dashboard-kpis">
            <KPICard title="Total Investido" icon={DollarSign} value={formatCurrency(totals.custo)} />
            <KPICard title="Total de Impressões" icon={Eye} value={formatNumber(totals.impressoes)} />
            <KPICard title="Total de Cliques" icon={MousePointer} value={formatNumber(totals.cliques)} />
            <KPICard title="Conversões" icon={Target} value={formatNumber(totals.conversoes)} />
            <KPICard title="CTR Médio" icon={TrendingUp} value={formatPercentage(ctr)} />
            <KPICard title="CPC Médio" icon={Calculator} value={formatCurrency(cpc)} />
        </div>
    );
};

export default KPIs;
