import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Shield, BarChart3, Users, Calendar, FileText } from "lucide-react"
import Image from "next/image"

const marketData = [
  { name: "Selic/Tesouro", min: 0.8, max: 1.0, avg: 0.9 },
  { name: "CDBs/Fundos RF", min: 1.0, max: 1.2, avg: 1.1 },
  { name: "Fundos Multi", min: 1.5, max: 2.0, avg: 1.75 },
  { name: "Agrinvest", min: 2.0, max: 3.0, avg: 2.50 },
]

const highlights = {
  opsAtivas: 18,
  volume30d: 12800000,
  proj: {
    "12m": { 
      conservador: 2.0,
      base: 2.4,
      otimista: 3.0,
    },
    "24m": { 
      conservador: 2.1,
      base: 2.5,
      otimista: 3.2,
    },
    "36m": { 
      conservador: 3.5,
      base: 3.0,
      otimista: 3.0,
    },
  },
};

export default function HomePage() {
  const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/akintec/30min"

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section 
        className="relative min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: "url('/images/bg-initial.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <div className="absolute inset-0 bg-black/40"></div>
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-urbanist">
            Invista no futuro das commodities brasileiras
          </h1>
          <p className="text-xl text-white mb-8 max-w-4xl mx-auto font-ibm-plex-sans">
            A Agrinvest conecta o agronegócio nacional ao capital global, unindo tecnologia, finanças e sustentabilidade para gerar rentabilidade real.
          </p>
          <p className="text-lg text-white mb-8 max-w-4xl mx-auto font-ibm-plex-sans">
            Operações <strong>reais</strong> de antecipação de recebíveis do <strong>agro brasileiro</strong>, com <strong>governança e transparência</strong>.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Badge className="px-6 py-3 bg-white/20 text-white border-white/30 font-ibm-plex-sans">
              Estrutura privada auditada
            </Badge>
            <Badge className="px-6 py-3 bg-white/20 text-white border-white/30 font-ibm-plex-sans">
              Aportes a partir de R$5.000
            </Badge>
            <Badge className="px-6 py-3 bg-white/20 text-white border-white/30 font-ibm-plex-sans">
              Exclusivo por indicação
            </Badge>
          </div>

          <Button 
            size="lg" 
            className="bg-[#00BC6E] text-[#003F28] hover:bg-[#00BC6E]/90 font-inter font-semibold text-lg px-8 py-4"
            asChild
          >
            <a href={calendlyUrl} target="_blank" rel="noopener noreferrer">
              <Calendar className="w-5 h-5 mr-2" />
              Agendar Reunião
            </a>
          </Button>
        </div>
      </section>

          {/* UMA NOVA FORMA DE INVESTIR */}
          <section 
            className="py-20 px-4"
            style={{
              height: '800px',
              background: 'linear-gradient(180deg, #00A568 0%, #003F28 100%)'
            }}
          >
            <div className="container mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div>
                  <div className="flex justify-center lg:justify-start mb-6">
                    <Image 
                      src="/images/uma_nova_forma.png" 
                      alt="UMA NOVA FORMA DE INVESTIR NO AGRO BRASILEIRO" 
                      width={500} 
                      height={120}
                      className="max-w-full h-auto"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-lg text-white font-ibm-plex-sans leading-relaxed">
                    A Agrinvest é uma iniciativa da <strong>AkinTec Holding</strong>, grupo com mais de seis anos de experiência em investimentos estruturados, logística e trading internacional. Com presença global e tecnologia de tokenização, oferecemos acesso seguro, transparente e rentável a ativos com alto potencial de valorização.
                  </p>
                </div>
              </div>
            </div>
          </section>

      {/* Commodities Section */}
      <section 
        className="py-20 px-4" 
        style={{ 
          background: 'linear-gradient(180deg, #003F28 0%, #003562 100%)',
          marginBottom: 0
        }}
      >
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="flex justify-center">
              <Image 
                src="/images/img-acai.png" 
                alt="Commodities brasileiras" 
                width={400} 
                height={300}
                className="rounded-lg"
              />
            </div>
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-urbanist">
                Commodities brasileiras em ascensão global
              </h2>
              <p className="text-lg text-white font-ibm-plex-sans leading-relaxed">
                Com cada vez mais espaço nos mercados internacionais, criam oportunidades sólidas para investidores que buscam rentabilidade e segurança em ativos reais.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Rentabilidade e Diferenciais - Background Unificado */}
      <div 
        className="py-20 px-4"
        style={{
          background: 'linear-gradient(180deg, #003562 0%, #D9D9D9 100%), url("/images/blur-bg.png")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          marginTop: 0,
          marginBottom: 0
        }}
      >
        {/* Rentabilidade Section */}
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-12 font-urbanist">
            RENTABILIDADE COM SEGURANÇA E TRANSPARÊNCIA
          </h2>
          
          <div className="flex justify-center gap-8 mb-12">
            <Card className="bg-[#003562] border-0 text-center p-8">
              <CardTitle className="text-6xl font-bold text-white mb-2 font-ibm-plex-sans">18</CardTitle>
              <CardDescription className="text-white text-lg font-ibm-plex-sans">operações em curso</CardDescription>
            </Card>
            <Card className="bg-[#003562] border-0 text-center p-8">
              <CardTitle className="text-6xl font-bold text-white mb-2 font-ibm-plex-sans">R$12.8M</CardTitle>
              <CardDescription className="text-white text-lg font-ibm-plex-sans">volume financiado (30 dias)</CardDescription>
            </Card>
          </div>

          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-white text-center mb-8 font-urbanist">
              Cenários de Projeção
            </h3>
            <p className="text-white text-center mb-8 font-ibm-plex-sans">(%a.m alvo/esperado)</p>
            
            <div className="space-y-4">
              {Object.entries(highlights.proj).map(([periodo, valores]) => (
                <Card key={periodo} className="bg-[#D9D9D9] border-0 p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-[#003F28] font-ibm-plex-sans">{periodo}</span>
                    <div className="flex gap-8">
                      <div className="text-center">
                        <div className="text-xl font-bold text-[#4A4D4C] font-ibm-plex-sans">{valores.conservador}%</div>
                        <div className="text-sm text-[#4A4D4C] font-ibm-plex-sans">conservador</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-[#4A4D4C] font-ibm-plex-sans">{valores.base}%</div>
                        <div className="text-sm text-[#4A4D4C] font-ibm-plex-sans">base</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-[#00BC6E] font-ibm-plex-sans">{valores.otimista}%</div>
                        <div className="text-sm text-[#4A4D4C] font-ibm-plex-sans">otimista</div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Diferenciais + O AGRO do futuro + Footer - Background Unificado com blur-bg.png */}
      <div 
        className="py-20 px-4 relative"
        style={{ 
          background: 'linear-gradient(180deg, #D9D9D9 0%, #003F28 50%, #000000 100%)',
          marginTop: 0,
          minHeight: '100vh'
        }}
      >
        {/* Imagem blur-bg.png como overlay unificado */}
        <div 
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          style={{
            zIndex: 1
          }}
        >
          <div 
            className="w-[85%] h-full"
            style={{
              backgroundImage: "url('/images/blur-bg.png')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat"
            }}
          ></div>
        </div>
        
        {/* Diferenciais Competitivos */}
        <div className="container mx-auto mt-20 relative z-10">
          <div className="flex flex-col items-center">
            {/* Banner do título - quase transparente */}
            <div className="rounded-2xl px-8 py-4 mb-8 border border-white/20" style={{ background: 'linear-gradient(180deg, rgba(217, 217, 217, 0.1) 0%, rgba(217, 217, 217, 0.1) 100%)' }}>
              <h2 className="text-2xl font-bold text-[#003F28] font-urbanist">
                Diferenciais Competitivos
              </h2>
            </div>
            
            {/* Card principal - estilo das imagens */}
            <Card className="border-2 border-[#00BC6E] p-8 max-w-4xl mx-auto rounded-2xl" style={{ backgroundColor: 'rgba(0, 53, 98, 0.65)' }}>
              <div className="space-y-4">
                <div className="text-center text-white text-lg font-ibm-plex-sans py-4 border-b-2 border-[#00BC6E]">
                  Estrutura Privada Auditada
                </div>
                <div className="text-center text-white text-lg font-ibm-plex-sans py-4 border-b-2 border-[#00BC6E]">
                  Transparência & Relatórios
                </div>
                <div className="text-center text-white text-lg font-ibm-plex-sans py-4 border-b-2 border-[#00BC6E]">
                  Rentabilidade acima da renda fixa tradicional
                </div>
                <div className="text-center text-white text-lg font-ibm-plex-sans py-4 border-b-2 border-[#00BC6E]">
                  Impacto Real no Agro
                </div>
                <div className="text-center text-white text-lg font-ibm-plex-sans py-4">
                  Liquidez programada e previsível
                </div>
              </div>
            </Card>
          </div>
        </div>
        
        <div className="container mx-auto text-center relative z-10 mt-20">
          <div className="flex justify-center mb-6">
            <Image 
              src="/images/o_agro_do_futuro.png" 
              alt="O AGRO do futuro é inteligente, global e rentável" 
              width={800} 
              height={200}
              className="max-w-full h-auto"
            />
          </div>
          <p className="text-lg text-white mb-8 max-w-4xl mx-auto font-ibm-plex-sans">
            Mais do que um investimento, a <strong>Agrinvest</strong> é um ecossistema completo, integrando <strong>finanças estruturadas, logística própria e inovação tecnológica.</strong>
          </p>
          <p className="text-lg text-white mb-12 max-w-4xl mx-auto font-ibm-plex-sans">
            A SOLIDEZ INSTITUCIONAL COM A <strong>AGILIDADE</strong> QUE O INVESTIDOR PRECISA.
          </p>

        </div>

        {/* Footer */}
        <div className="container mx-auto mt-20">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-800 leading-relaxed font-ibm-plex-sans">
                Este produto NÃO é um FIDC regulado pela CVM. Trata-se de um Agrinvest - Clube de Investimento Privado, restrito a
                participantes convidados e qualificados, com base em contratos civis de sociedade em conta de
                participação. Rentabilidade apresentada é alvo/esperada, não garantida. Há riscos de mercado, crédito e
                liquidez. Resgates e liquidez respeitam prazos contratuais.
              </p>
            </div>
          </div>
              <div className="flex justify-between items-center">
                <p className="text-[#D9D9D9] font-ibm-plex-sans">© 2025 Agrinvest</p>
                <div className="text-[#00BC6E] font-bold font-urbanist">Agrinvest</div>
              </div>
        </div>
      </div>
    </div>
  )
}