| table_name                | column_name                   | data_type                | is_nullable | constraint_type | foreign_key_column       | referenced_table        | referenced_column |
| ------------------------- | ----------------------------- | ------------------------ | ----------- | --------------- | ------------------------ | ----------------------- | ----------------- |
| acessos_rapidos           | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| acessos_rapidos           | nome                          | text                     | NO          | null            | null                     | null                    | null              |
| acessos_rapidos           | link                          | text                     | NO          | null            | null                     | null                    | null              |
| acessos_rapidos           | login                         | text                     | YES         | null            | null                     | null                    | null              |
| acessos_rapidos           | senha                         | text                     | YES         | null            | null                     | null                    | null              |
| acessos_rapidos           | perfil_de_usuario_id          | uuid                     | YES         | FOREIGN KEY     | perfil_de_usuario_id     | perfil_de_usuario       | id                |
| acessos_rapidos           | e_sistema                     | boolean                  | NO          | null            | null                     | null                    | null              |
| acessos_rapidos           | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| acessos_rapidos           | atualizado_em                 | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| anuncios                  | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| anuncios                  | nome                          | text                     | NO          | null            | null                     | null                    | null              |
| anuncios                  | status                        | text                     | NO          | null            | null                     | null                    | null              |
| anuncios                  | external_id                   | text                     | YES         | null            | null                     | null                    | null              |
| anuncios                  | copy                          | jsonb                    | YES         | null            | null                     | null                    | null              |
| anuncios                  | preview_midia                 | text                     | YES         | null            | null                     | null                    | null              |
| anuncios                  | preview_link                  | text                     | YES         | null            | null                     | null                    | null              |
| anuncios                  | modelo_ids                    | ARRAY                    | YES         | null            | null                     | null                    | null              |
| anuncios                  | marca_id                      | uuid                     | YES         | FOREIGN KEY     | marca_id                 | marcas                  | id                |
| anuncios                  | plataforma_id                 | uuid                     | YES         | FOREIGN KEY     | plataforma_id            | plataformas             | id                |
| anuncios                  | conta_de_anuncio_id           | uuid                     | YES         | FOREIGN KEY     | conta_de_anuncio_id      | contas_de_anuncio       | id                |
| anuncios                  | campanha_id                   | uuid                     | YES         | FOREIGN KEY     | campanha_id              | campanhas               | id                |
| anuncios                  | grupo_de_anuncio_id           | uuid                     | YES         | FOREIGN KEY     | grupo_de_anuncio_id      | grupos_de_anuncios      | id                |
| anuncios                  | metricas                      | jsonb                    | YES         | null            | null                     | null                    | null              |
| anuncios                  | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| anuncios                  | atualizado_em                 | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| anuncios                  | configuracoes_avancadas       | jsonb                    | YES         | null            | null                     | null                    | null              |
| anuncios                  | orcamentos                    | jsonb                    | YES         | null            | null                     | null                    | null              |
| anuncios                  | obs                           | text                     | YES         | null            | null                     | null                    | null              |
| audiencias                | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| audiencias                | modelo_id                     | uuid                     | NO          | FOREIGN KEY     | modelo_id                | modelos                 | id                |
| audiencias                | nome_perfil                   | text                     | NO          | null            | null                     | null                    | null              |
| audiencias                | descricao                     | text                     | NO          | null            | null                     | null                    | null              |
| audiencias                | faixa_etaria                  | text                     | NO          | null            | null                     | null                    | null              |
| audiencias                | genero                        | text                     | NO          | null            | null                     | null                    | null              |
| audiencias                | localizacao                   | text                     | NO          | null            | null                     | null                    | null              |
| audiencias                | interesses                    | ARRAY                    | NO          | null            | null                     | null                    | null              |
| audiencias                | comportamentos                | ARRAY                    | NO          | null            | null                     | null                    | null              |
| audiencias                | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| campanhas                 | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| campanhas                 | nome                          | character varying        | NO          | null            | null                     | null                    | null              |
| campanhas                 | marca_id                      | uuid                     | NO          | FOREIGN KEY     | marca_id                 | marcas                  | id                |
| campanhas                 | conta_de_anuncio_id           | uuid                     | NO          | FOREIGN KEY     | conta_de_anuncio_id      | contas_de_anuncio       | id                |
| campanhas                 | status                        | text                     | NO          | null            | null                     | null                    | null              |
| campanhas                 | objetivo                      | character varying        | NO          | null            | null                     | null                    | null              |
| campanhas                 | conversao_desejada            | character varying        | NO          | null            | null                     | null                    | null              |
| campanhas                 | orcamento                     | jsonb                    | NO          | null            | null                     | null                    | null              |
| campanhas                 | data_inicio                   | timestamp with time zone | NO          | null            | null                     | null                    | null              |
| campanhas                 | data_fim                      | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| campanhas                 | palavras_chave                | ARRAY                    | YES         | null            | null                     | null                    | null              |
| campanhas                 | palavras_chave_negativas      | ARRAY                    | YES         | null            | null                     | null                    | null              |
| campanhas                 | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| campanhas                 | atualizado_em                 | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| campanhas                 | external_id                   | text                     | YES         | null            | null                     | null                    | null              |
| campanhas                 | modelo_id                     | uuid                     | YES         | FOREIGN KEY     | modelo_id                | modelos                 | id                |
| contas_de_anuncio         | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| contas_de_anuncio         | nome                          | character varying        | NO          | UNIQUE          | nome                     | null                    | null              |
| contas_de_anuncio         | plataforma_id                 | uuid                     | NO          | FOREIGN KEY     | plataforma_id            | plataformas             | id                |
| contas_de_anuncio         | plataforma_id                 | uuid                     | NO          | FOREIGN KEY     | plataforma_id            | plataformas             | id                |
| contas_de_anuncio         | identificador_na_plataforma   | character varying        | YES         | null            | null                     | null                    | null              |
| contas_de_anuncio         | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| copiei                    | id                            | bigint                   | NO          | PRIMARY KEY     | id                       | null                    | null              |
| copiei                    | created_at                    | timestamp with time zone | NO          | null            | null                     | null                    | null              |
| copiei                    | em_json                       | text                     | YES         | null            | null                     | null                    | null              |
| criativos                 | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| criativos                 | grupo_de_anuncio_id           | uuid                     | NO          | FOREIGN KEY     | grupo_de_anuncio_id      | grupos_de_anuncios      | id                |
| criativos                 | urls_criativo                 | ARRAY                    | YES         | null            | null                     | null                    | null              |
| criativos                 | tipo                          | text                     | NO          | null            | null                     | null                    | null              |
| criativos                 | textos_principais             | ARRAY                    | YES         | null            | null                     | null                    | null              |
| criativos                 | titulos                       | ARRAY                    | YES         | null            | null                     | null                    | null              |
| criativos                 | descricoes                    | ARRAY                    | YES         | null            | null                     | null                    | null              |
| criativos                 | chamada_para_acao             | character varying        | YES         | null            | null                     | null                    | null              |
| criativos                 | extensoes_de_anuncio          | jsonb                    | YES         | null            | null                     | null                    | null              |
| criativos                 | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| criativos                 | campanha_id                   | uuid                     | NO          | FOREIGN KEY     | campanha_id              | campanhas               | id                |
| criativos                 | status                        | text                     | YES         | null            | null                     | null                    | null              |
| criativos                 | external_id                   | text                     | YES         | null            | null                     | null                    | null              |
| criativos                 | nome                          | text                     | YES         | null            | null                     | null                    | null              |
| criativos                 | modelo_id                     | uuid                     | YES         | FOREIGN KEY     | modelo_id                | modelos                 | id                |
| formularios               | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| formularios               | nome                          | character varying        | NO          | null            | null                     | null                    | null              |
| formularios               | status                        | character varying        | NO          | null            | null                     | null                    | null              |
| formularios               | conta_de_anuncio_id           | uuid                     | NO          | FOREIGN KEY     | conta_de_anuncio_id      | contas_de_anuncio       | id                |
| grupos_de_anuncios        | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| grupos_de_anuncios        | campanha_id                   | uuid                     | NO          | FOREIGN KEY     | campanha_id              | campanhas               | id                |
| grupos_de_anuncios        | nome                          | character varying        | NO          | null            | null                     | null                    | null              |
| grupos_de_anuncios        | status                        | text                     | NO          | null            | null                     | null                    | null              |
| grupos_de_anuncios        | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| grupos_de_anuncios        | direcionamento                | jsonb                    | YES         | null            | null                     | null                    | null              |
| grupos_de_anuncios        | posicionamentos               | jsonb                    | YES         | null            | null                     | null                    | null              |
| grupos_de_anuncios        | external_id                   | text                     | YES         | null            | null                     | null                    | null              |
| grupos_de_anuncios        | orcamento                     | jsonb                    | YES         | null            | null                     | null                    | null              |
| grupos_de_anuncios        | modelo_id                     | uuid                     | YES         | FOREIGN KEY     | modelo_id                | modelos                 | id                |
| historico_otimizacoes     | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| historico_otimizacoes     | descricao                     | text                     | NO          | null            | null                     | null                    | null              |
| historico_otimizacoes     | status                        | text                     | NO          | null            | null                     | null                    | null              |
| historico_otimizacoes     | tipo_alteracao                | text                     | YES         | null            | null                     | null                    | null              |
| historico_otimizacoes     | hipotese                      | text                     | YES         | null            | null                     | null                    | null              |
| historico_otimizacoes     | responsavel                   | text                     | NO          | null            | null                     | null                    | null              |
| historico_otimizacoes     | data_alteracao                | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| historico_otimizacoes     | criado_em                     | timestamp with time zone | NO          | null            | null                     | null                    | null              |
| historico_otimizacoes     | plataforma_id                 | uuid                     | YES         | FOREIGN KEY     | plataforma_id            | plataformas             | id                |
| historico_otimizacoes     | marca_id                      | uuid                     | YES         | FOREIGN KEY     | marca_id                 | marcas                  | id                |
| historico_otimizacoes     | conta_de_anuncio_id           | uuid                     | YES         | FOREIGN KEY     | conta_de_anuncio_id      | contas_de_anuncio       | id                |
| historico_otimizacoes     | campanha_id                   | uuid                     | YES         | FOREIGN KEY     | campanha_id              | campanhas               | id                |
| historico_otimizacoes     | grupo_de_anuncio_id           | uuid                     | YES         | FOREIGN KEY     | grupo_de_anuncio_id      | grupos_de_anuncios      | id                |
| historico_otimizacoes     | criativo_id                   | uuid                     | YES         | FOREIGN KEY     | criativo_id              | criativos               | id                |
| historico_otimizacoes     | orcamento_mensal_id           | uuid                     | YES         | FOREIGN KEY     | orcamento_mensal_id      | orcamento_mensal        | id                |
| historico_otimizacoes     | orcamento_detalhado_id        | uuid                     | YES         | FOREIGN KEY     | orcamento_detalhado_id   | orcamento_detalhado     | id                |
| historico_otimizacoes     | publico_personalizado_id      | uuid                     | YES         | FOREIGN KEY     | publico_personalizado_id | publicos_personalizados | id                |
| historico_otimizacoes     | anuncio_id                    | uuid                     | YES         | FOREIGN KEY     | anuncio_id               | anuncios                | id                |
| historico_otimizacoes     | lead_id                       | uuid                     | YES         | FOREIGN KEY     | lead_id                  | leads                   | id                |
| historico_otimizacoes     | formulario_id                 | uuid                     | YES         | FOREIGN KEY     | formulario_id            | formularios             | id                |
| landing_pages             | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| landing_pages             | links                         | text                     | YES         | null            | null                     | null                    | null              |
| landing_pages             | status                        | text                     | NO          | null            | null                     | null                    | null              |
| landing_pages             | id_marcas                     | uuid                     | NO          | FOREIGN KEY     | id_marcas                | marcas                  | id                |
| leads                     | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| leads                     | conta_de_anuncio_id           | uuid                     | YES         | FOREIGN KEY     | conta_de_anuncio_id      | contas_de_anuncio       | id                |
| leads                     | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| leads                     | nome                          | text                     | YES         | null            | null                     | null                    | null              |
| leads                     | email                         | text                     | YES         | null            | null                     | null                    | null              |
| leads                     | fonte                         | text                     | YES         | null            | null                     | null                    | null              |
| leads                     | nome_formulario               | text                     | YES         | null            | null                     | null                    | null              |
| leads                     | canal                         | text                     | YES         | null            | null                     | null                    | null              |
| leads                     | estagio                       | text                     | YES         | null            | null                     | null                    | null              |
| leads                     | proprietario                  | text                     | YES         | null            | null                     | null                    | null              |
| leads                     | rotulos                       | text                     | YES         | null            | null                     | null                    | null              |
| leads                     | telefone                      | text                     | YES         | null            | null                     | null                    | null              |
| leads                     | telefone_secundario           | text                     | YES         | null            | null                     | null                    | null              |
| leads                     | whatsapp                      | text                     | YES         | null            | null                     | null                    | null              |
| leads                     | importado_em                  | timestamp with time zone | NO          | null            | null                     | null                    | null              |
| leads                     | formulario_id                 | uuid                     | NO          | FOREIGN KEY     | formulario_id            | formularios             | id                |
| marcas                    | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| marcas                    | nome                          | text                     | NO          | UNIQUE          | nome                     | null                    | null              |
| marcas                    | nome_perfil                   | text                     | NO          | null            | null                     | null                    | null              |
| marcas                    | descricao                     | text                     | NO          | null            | null                     | null                    | null              |
| marcas                    | faixa_etaria                  | text                     | NO          | null            | null                     | null                    | null              |
| marcas                    | genero                        | text                     | NO          | null            | null                     | null                    | null              |
| marcas                    | localizacao                   | text                     | NO          | null            | null                     | null                    | null              |
| marcas                    | interesses                    | ARRAY                    | NO          | null            | null                     | null                    | null              |
| marcas                    | comportamentos                | ARRAY                    | NO          | null            | null                     | null                    | null              |
| marcas                    | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| marcas_contas             | marca_id                      | uuid                     | NO          | PRIMARY KEY     | marca_id                 | null                    | null              |
| marcas_contas             | marca_id                      | uuid                     | NO          | FOREIGN KEY     | marca_id                 | marcas                  | id                |
| marcas_contas             | conta_de_anuncio_id           | uuid                     | NO          | FOREIGN KEY     | conta_de_anuncio_id      | contas_de_anuncio       | id                |
| marcas_contas             | conta_de_anuncio_id           | uuid                     | NO          | PRIMARY KEY     | conta_de_anuncio_id      | null                    | null              |
| modelos                   | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| modelos                   | marca_id                      | uuid                     | NO          | FOREIGN KEY     | marca_id                 | marcas                  | id                |
| modelos                   | nome                          | text                     | NO          | null            | null                     | null                    | null              |
| modelos                   | segmento                      | text                     | YES         | null            | null                     | null                    | null              |
| modelos                   | status                        | text                     | YES         | null            | null                     | null                    | null              |
| modelos                   | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| modelos                   | preco                         | numeric                  | YES         | null            | null                     | null                    | null              |
| modelos                   | descricao                     | jsonb                    | YES         | null            | null                     | null                    | null              |
| modelos                   | slug                          | character varying        | YES         | null            | null                     | null                    | null              |
| orcamento_detalhado       | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| orcamento_detalhado       | orcamento_mensal_id           | uuid                     | NO          | UNIQUE          | orcamento_mensal_id      | null                    | null              |
| orcamento_detalhado       | orcamento_mensal_id           | uuid                     | NO          | FOREIGN KEY     | orcamento_mensal_id      | orcamento_mensal        | id                |
| orcamento_detalhado       | modelo_id                     | uuid                     | NO          | UNIQUE          | modelo_id                | null                    | null              |
| orcamento_detalhado       | modelo_id                     | uuid                     | NO          | FOREIGN KEY     | modelo_id                | modelos                 | id                |
| orcamento_detalhado       | conta_de_anuncio_id           | uuid                     | NO          | FOREIGN KEY     | conta_de_anuncio_id      | contas_de_anuncio       | id                |
| orcamento_detalhado       | conta_de_anuncio_id           | uuid                     | NO          | UNIQUE          | conta_de_anuncio_id      | null                    | null              |
| orcamento_detalhado       | ativo                         | boolean                  | NO          | null            | null                     | null                    | null              |
| orcamento_detalhado       | orcamento_diario_planejado    | numeric                  | NO          | null            | null                     | null                    | null              |
| orcamento_detalhado       | orcamento_total_planejado     | numeric                  | NO          | null            | null                     | null                    | null              |
| orcamento_detalhado       | resultados_planejados         | integer                  | NO          | null            | null                     | null                    | null              |
| orcamento_detalhado       | observacoes                   | text                     | YES         | null            | null                     | null                    | null              |
| orcamento_detalhado       | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| orcamento_detalhado       | atualizado_em                 | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| orcamento_mensal          | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| orcamento_mensal          | marca_id                      | uuid                     | NO          | UNIQUE          | marca_id                 | null                    | null              |
| orcamento_mensal          | marca_id                      | uuid                     | NO          | FOREIGN KEY     | marca_id                 | marcas                  | id                |
| orcamento_mensal          | mes                           | integer                  | NO          | UNIQUE          | mes                      | null                    | null              |
| orcamento_mensal          | ano                           | integer                  | NO          | UNIQUE          | ano                      | null                    | null              |
| orcamento_mensal          | meta_investimento_total       | numeric                  | NO          | null            | null                     | null                    | null              |
| orcamento_mensal          | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| orcamento_mensal          | atualizado_em                 | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| orcamento_mensal          | meta_investimento_google      | numeric                  | NO          | null            | null                     | null                    | null              |
| orcamento_mensal          | meta_investimento_meta        | numeric                  | NO          | null            | null                     | null                    | null              |
| perfil_de_usuario         | id                            | uuid                     | NO          | FOREIGN KEY     | id                       | null                    | null              |
| perfil_de_usuario         | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| perfil_de_usuario         | nome                          | text                     | YES         | null            | null                     | null                    | null              |
| perfil_de_usuario         | email                         | text                     | YES         | null            | null                     | null                    | null              |
| perfil_de_usuario         | avatar_url                    | text                     | YES         | null            | null                     | null                    | null              |
| perfil_de_usuario         | telefone                      | text                     | YES         | null            | null                     | null                    | null              |
| perfil_de_usuario         | cargo                         | text                     | YES         | null            | null                     | null                    | null              |
| perfil_de_usuario         | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| perfil_de_usuario         | atualizado_em                 | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| plataformas               | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| plataformas               | nome                          | character varying        | NO          | UNIQUE          | nome                     | null                    | null              |
| plataformas               | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| publicos_personalizados   | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| publicos_personalizados   | plataforma_id                 | uuid                     | NO          | FOREIGN KEY     | plataforma_id            | plataformas             | id                |
| publicos_personalizados   | nome                          | text                     | NO          | null            | null                     | null                    | null              |
| publicos_personalizados   | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| publicos_personalizados   | idade_minima                  | smallint                 | YES         | null            | null                     | null                    | null              |
| publicos_personalizados   | idade_maxima                  | smallint                 | YES         | null            | null                     | null                    | null              |
| publicos_personalizados   | genero                        | USER-DEFINED             | YES         | null            | null                     | null                    | null              |
| publicos_personalizados   | localizacoes                  | jsonb                    | YES         | null            | null                     | null                    | null              |
| publicos_personalizados   | direcionamento_meta           | jsonb                    | YES         | null            | null                     | null                    | null              |
| publicos_personalizados   | direcionamento_google         | jsonb                    | YES         | null            | null                     | null                    | null              |
| relatorio_anuncios        | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| relatorio_anuncios        | anuncio_id                    | uuid                     | NO          | UNIQUE          | anuncio_id               | null                    | null              |
| relatorio_anuncios        | anuncio_id                    | uuid                     | NO          | FOREIGN KEY     | anuncio_id               | anuncios                | id                |
| relatorio_anuncios        | marca_id                      | uuid                     | YES         | FOREIGN KEY     | marca_id                 | marcas                  | id                |
| relatorio_anuncios        | plataforma_id                 | uuid                     | YES         | FOREIGN KEY     | plataforma_id            | plataformas             | id                |
| relatorio_anuncios        | conta_de_anuncio_id           | uuid                     | YES         | FOREIGN KEY     | conta_de_anuncio_id      | contas_de_anuncio       | id                |
| relatorio_anuncios        | modelo_id                     | uuid                     | YES         | FOREIGN KEY     | modelo_id                | modelos                 | id                |
| relatorio_anuncios        | data_inicio                   | date                     | NO          | UNIQUE          | data_inicio              | null                    | null              |
| relatorio_anuncios        | data_fim                      | date                     | NO          | null            | null                     | null                    | null              |
| relatorio_anuncios        | spend                         | numeric                  | YES         | null            | null                     | null                    | null              |
| relatorio_anuncios        | cpc                           | numeric                  | YES         | null            | null                     | null                    | null              |
| relatorio_anuncios        | ctr                           | numeric                  | YES         | null            | null                     | null                    | null              |
| relatorio_anuncios        | conversao                     | numeric                  | YES         | null            | null                     | null                    | null              |
| relatorio_anuncios        | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| relatorio_anuncios        | atualizado_em                 | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| relatorio_completo_marcas | marca                         | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_completo_marcas | plataforma                    | character varying        | YES         | null            | null                     | null                    | null              |
| relatorio_completo_marcas | conta_nome                    | character varying        | YES         | null            | null                     | null                    | null              |
| relatorio_completo_marcas | conta_id                      | uuid                     | YES         | null            | null                     | null                    | null              |
| relatorio_completo_marcas | marca_id                      | uuid                     | YES         | null            | null                     | null                    | null              |
| relatorio_completo_marcas | plataforma_id                 | uuid                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| relatorio_performance     | data_relatorio                | date                     | NO          | null            | null                     | null                    | null              |
| relatorio_performance     | campanha_id                   | uuid                     | YES         | FOREIGN KEY     | campanha_id              | campanhas               | id                |
| relatorio_performance     | impressoes                    | integer                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | cliques                       | integer                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | custo                         | numeric                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | conversoes                    | integer                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | alcance                       | integer                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | dados_brutos_plataforma       | jsonb                    | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | criado_em                     | timestamp with time zone | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | grupo_de_anuncio_id           | uuid                     | YES         | FOREIGN KEY     | grupo_de_anuncio_id      | grupos_de_anuncios      | id                |
| relatorio_performance     | criativo_id                   | uuid                     | YES         | FOREIGN KEY     | criativo_id              | criativos               | id                |
| relatorio_performance     | publico_personalizado_id      | uuid                     | YES         | FOREIGN KEY     | publico_personalizado_id | publicos_personalizados | id                |
| relatorio_performance     | nome_conta                    | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | nome_campanha                 | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | nome_conjunto_anuncios        | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | nome_anuncio                  | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | idade                         | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | genero                        | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | external_conta_id             | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | external_campanha_id          | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | external_grupo_id             | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | external_criativo_id          | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | frequencia                    | numeric                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | configuracao_atribuicao       | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | cpc_link                      | numeric                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | ctr_todos                     | numeric                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | cpm                           | numeric                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | cliques_todos                 | integer                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | cpc_todos                     | numeric                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | custo_por_lead                | numeric                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | leads_site                    | integer                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | leads_offline                 | integer                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | leads_meta                    | integer                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | valor_conversao_leads_offline | numeric                  | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | objetivo_campanha             | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | lance                         | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | tipo_lance                    | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | descricao_criativo            | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | headline_criativo             | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | url_site_criativo             | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | call_to_action                | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | hash_imagem_criativo          | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | nome_imagem_criativo          | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | nome_video_criativo           | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | external_video_id_criativo    | text                     | YES         | null            | null                     | null                    | null              |
| relatorio_performance     | moeda                         | character varying        | YES         | null            | null                     | null                    | null              |
| system_docs               | id                            | uuid                     | NO          | PRIMARY KEY     | id                       | null                    | null              |
| system_docs               | object_name                   | text                     | NO          | null            | null                     | null                    | null              |
| system_docs               | object_type                   | text                     | NO          | null            | null                     | null                    | null              |
| system_docs               | description                   | text                     | YES         | null            | null                     | null                    | null              |
| system_docs               | related_table                 | text                     | YES         | null            | null                     | null                    | null              |
| system_docs               | parameters                    | jsonb                    | YES         | null            | null                     | null                    | null              |
| system_docs               | return_type                   | text                     | YES         | null            | null                     | null                    | null              |
| system_docs               | example_usage                 | text                     | YES         | null            | null                     | null                    | null              |
| system_docs               | created_at                    | timestamp with time zone | NO          | null            | null                     | null                    | null              |
| system_docs               | updated_at                    | timestamp with time zone | NO          | null            | null                     | null                    | null              |