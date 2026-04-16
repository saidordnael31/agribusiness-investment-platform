import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, FileText } from "lucide-react"
import Image from "next/image"

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

          <div className="flex justify-center">
            <Button
              asChild
              size="lg"
              className="bg-[#00BC6E] hover:bg-[#00A568] text-white font-bold px-8 py-6 text-lg font-ibm-plex-sans"
            >
              <a
                href={calendlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Agendar Reunião
              </a>
            </Button>
          </div>

        </div>
      </section>

          {/* UMA NOVA FORMA DE INVESTIR */}
          <section 
            className="py-20 px-4 min-h-[800px]"
            style={{
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

      {/* Diferenciais + O AGRO do futuro + Footer - Background Unificado com blur-bg.png */}
      <div 
        className="py-20 px-4 relative min-h-screen"
        style={{ 
          background: 'linear-gradient(180deg, #D9D9D9 0%, #003F28 50%, #000000 100%)',
          marginTop: 0
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