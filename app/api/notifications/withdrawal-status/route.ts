import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { transactionId, userId, status, message } = await request.json()
    const supabase = await createServerClient()

    if (!transactionId || !userId || !status) {
      return NextResponse.json({ 
        success: false, 
        error: "Dados obrigatórios: transactionId, userId, status" 
      }, { status: 400 })
    }

    // Buscar dados do usuário para notificação
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: "Usuário não encontrado" 
      }, { status: 404 })
    }

    // Buscar dados da transação
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single()

    if (transactionError || !transaction) {
      return NextResponse.json({ 
        success: false, 
        error: "Transação não encontrada" 
      }, { status: 404 })
    }

    // Log da notificação
    console.log("Enviando notificação de status:", {
      transactionId,
      userId,
      status,
      userEmail: user.email,
      amount: transaction.amount,
      timestamp: new Date().toISOString()
    })

    // Aqui você pode integrar com serviços de email/SMS
    // Por exemplo: SendGrid, Twilio, etc.
    
    // Por enquanto, vamos apenas logar a notificação
    const notificationData = {
      transactionId,
      userId,
      userEmail: user.email,
      userName: user.full_name,
      status,
      amount: transaction.amount,
      message: message || getDefaultMessage(status, transaction.amount),
      timestamp: new Date().toISOString()
    }

    console.log("Notificação preparada:", notificationData)

    // TODO: Implementar envio real de email/SMS
    // await sendEmail(user.email, getEmailSubject(status), getEmailBody(notificationData))
    // await sendSMS(user.phone, getSMSMessage(notificationData))

    return NextResponse.json({
      success: true,
      data: notificationData,
      message: "Notificação enviada com sucesso!",
    })
  } catch (error) {
    console.error("Send notification error:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}

function getDefaultMessage(status: string, amount: number): string {
  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount)

  switch (status) {
    case 'completed':
      return `Seu resgate de ${formattedAmount} foi aprovado e processado com sucesso!`
    case 'failed':
      return `Seu resgate de ${formattedAmount} foi rejeitado. Entre em contato para mais informações.`
    case 'pending':
      return `Seu resgate de ${formattedAmount} está sendo analisado. Você será notificado em breve.`
    default:
      return `Status do seu resgate de ${formattedAmount} foi atualizado.`
  }
}

function getEmailSubject(status: string): string {
  switch (status) {
    case 'completed':
      return 'Resgate Aprovado - Akintec Investimentos'
    case 'failed':
      return 'Resgate Rejeitado - Akintec Investimentos'
    case 'pending':
      return 'Resgate em Análise - Akintec Investimentos'
    default:
      return 'Atualização de Resgate - Akintec Investimentos'
  }
}

function getEmailBody(data: any): string {
  return `
    <h2>Olá ${data.userName}!</h2>
    <p>${data.message}</p>
    <p><strong>Valor:</strong> ${new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(data.amount)}</p>
    <p><strong>Protocolo:</strong> ${data.transactionId}</p>
    <p><strong>Data:</strong> ${new Date(data.timestamp).toLocaleString("pt-BR")}</p>
    <br>
    <p>Atenciosamente,<br>Equipe Akintec Investimentos</p>
  `
}

function getSMSMessage(data: any): string {
  return `${data.message} Protocolo: ${data.transactionId.slice(-8)}`
}
