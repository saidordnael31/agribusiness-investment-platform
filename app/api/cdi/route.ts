import { NextResponse } from "next/server";

/**
 * API para buscar a taxa CDI atual
 * Usa a API do Banco Central do Brasil (BCB) para obter o CDI diário
 */
export async function GET() {
  try {
    // API do Banco Central do Brasil - Série histórica do CDI
    // Código da série: 12 (CDI diário)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    
    // Formato: YYYY-MM-DD
    const endDate = `${year}-${month}-${day}`;
    
    // Buscar últimos 30 dias para calcular média mensal
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

    // API do BCB - Série 12 (CDI diário)
    const bcbUrl = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${startDateStr}&dataFinal=${endDate}`;
    
    try {
      const response = await fetch(bcbUrl, {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 } // Cache por 1 hora
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar CDI do BCB');
      }

      const data = await response.json();
      
      // Verificar se data é um array
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('Resposta do BCB não é um array válido:', typeof data, data);
        // Fallback: usar taxa padrão se não conseguir buscar
        return NextResponse.json({
          success: true,
          cdiDaily: 0.0003, // ~0.03% ao dia (aproximadamente 0.9% ao mês)
          cdiMonthly: 0.009, // ~0.9% ao mês (aproximadamente 10.8% ao ano)
          cdiYearly: 0.108, // ~10.8% ao ano
          source: 'fallback',
          lastUpdate: new Date().toISOString(),
          error: 'Resposta do BCB não é um array válido'
        });
      }

      // Calcular média dos últimos 30 dias
      const values = data
        .map((item: any) => {
          // A API do BCB retorna { data: "DD/MM/YYYY", valor: "X.XX" }
          const valor = item.valor || item.value || 0;
          return parseFloat(String(valor).replace(',', '.'));
        })
        .filter((v: number) => !isNaN(v) && v > 0);
      
      if (values.length === 0) {
        console.log('Nenhum valor válido encontrado nos dados do BCB');
        throw new Error('Nenhum valor válido encontrado');
      }

      // CDI diário médio (em decimal)
      // A API do BCB retorna o CDI já em percentual (ex: 0.03 = 0.03%)
      // Precisamos dividir por 100 para converter para decimal
      const cdiDailyPercent = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
      const cdiDaily = cdiDailyPercent / 100; // Converter de percentual para decimal
      
      // CDI mensal aproximado (considerando 21 dias úteis)
      // Fórmula: (1 + CDI_diário)^21 - 1
      const cdiMonthly = Math.pow(1 + cdiDaily, 21) - 1;
      
      // CDI anual aproximado
      const cdiYearly = Math.pow(1 + cdiDaily, 252) - 1; // 252 dias úteis no ano

      return NextResponse.json({
        success: true,
        cdiDaily,
        cdiMonthly,
        cdiYearly,
        source: 'bcb',
        lastUpdate: new Date().toISOString(),
        dataPoints: values.length
      });
    } catch (bcbError) {
      console.error('Erro ao buscar CDI do BCB:', bcbError);
      
      // Tentar API alternativa: brapi.dev (SELIC, que é próxima do CDI)
      try {
        const brapiResponse = await fetch('https://brapi.dev/api/v2/prime-rate', {
          headers: {
            'Accept': 'application/json',
          },
          next: { revalidate: 3600 }
        });

        if (brapiResponse.ok) {
          const brapiData = await brapiResponse.json();
          
          // SELIC está geralmente 0.15% acima do CDI
          // CDI ≈ SELIC * 0.9915
          if (brapiData && brapiData.primeRate) {
            const selicYearly = parseFloat(brapiData.primeRate) / 100; // Converter para decimal
            const cdiYearly = selicYearly * 0.9915; // Aproximação: CDI = 99.15% da SELIC
            const cdiMonthly = Math.pow(1 + cdiYearly, 1/12) - 1; // Converter anual para mensal
            const cdiDaily = Math.pow(1 + cdiYearly, 1/252) - 1; // Converter anual para diário (252 dias úteis)

            return NextResponse.json({
              success: true,
              cdiDaily,
              cdiMonthly,
              cdiYearly,
              source: 'brapi',
              lastUpdate: new Date().toISOString(),
              selicRate: selicYearly
            });
          }
        }
      } catch (brapiError) {
        console.error('Erro ao buscar SELIC do brapi.dev:', brapiError);
      }
      
      // Fallback final: usar taxa padrão baseada em média histórica
      return NextResponse.json({
        success: true,
        cdiDaily: 0.0003, // ~0.03% ao dia
        cdiMonthly: 0.008, // ~0.8% ao mês (aproximadamente 10% ao ano)
        cdiYearly: 0.10, // ~10% ao ano
        source: 'fallback',
        lastUpdate: new Date().toISOString(),
        error: 'APIs não disponíveis, usando taxa padrão'
      });
    }
  } catch (error: any) {
    console.error('Erro ao buscar CDI:', error);
    
    // Fallback final
    return NextResponse.json({
      success: true,
      cdiDaily: 0.0003,
      cdiMonthly: 0.008, // 0.8% ao mês
      cdiYearly: 0.10,
      source: 'fallback',
      lastUpdate: new Date().toISOString(),
      error: error.message
    });
  }
}

