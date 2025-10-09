# Configuração de Email Personalizado - Supabase

Para personalizar o template de email do magic link no Supabase, siga estes passos:

## 1. Acesse o Dashboard do Supabase
- Vá para [supabase.com](https://supabase.com)
- Faça login na sua conta
- Selecione seu projeto

## 2. Configure o Template de Email
- No menu lateral, vá para **Authentication** > **Email Templates**
- Selecione **Magic Link**
- Substitua o template padrão pelo seguinte:

### Template HTML Personalizado:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link de Acesso - Plataforma Agroderi</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .message {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 30px;
            line-height: 1.7;
        }
        .cta-container {
            text-align: center;
            margin: 40px 0;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            text-decoration: none;
            padding: 16px 32px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            transition: all 0.3s ease;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
        }
        .security-note {
            background-color: #f0f9ff;
            border-left: 4px solid #0ea5e9;
            padding: 20px;
            margin: 30px 0;
            border-radius: 0 8px 8px 0;
        }
        .security-note h3 {
            margin: 0 0 10px 0;
            color: #0c4a6e;
            font-size: 16px;
        }
        .security-note p {
            margin: 0;
            color: #075985;
            font-size: 14px;
        }
        .footer {
            background-color: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
        }
        .footer a {
            color: #10b981;
            text-decoration: none;
        }
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
            margin: 30px 0;
        }
        .features {
            display: flex;
            justify-content: space-around;
            margin: 30px 0;
            flex-wrap: wrap;
        }
        .feature {
            text-align: center;
            padding: 20px;
            flex: 1;
            min-width: 150px;
        }
        .feature-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 50%;
            margin: 0 auto 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
        }
        .feature h4 {
            margin: 0 0 8px 0;
            color: #1f2937;
            font-size: 14px;
            font-weight: 600;
        }
        .feature p {
            margin: 0;
            color: #6b7280;
            font-size: 12px;
        }
        @media (max-width: 600px) {
            .container {
                margin: 0;
                border-radius: 0;
            }
            .header, .content, .footer {
                padding: 20px;
            }
            .features {
                flex-direction: column;
            }
            .feature {
                margin-bottom: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Acesso Seguro</h1>
            <p>Faça login na sua conta Plataforma Agroderi</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                Olá! 👋
            </div>
            
            <div class="message">
                Você solicitou um link de acesso seguro para sua conta. Clique no botão abaixo para fazer login automaticamente, sem precisar de senha.
            </div>
            
            <div class="cta-container">
                <a href="{{ .ConfirmationURL }}" class="cta-button">
                    🚀 Acessar Minha Conta
                </a>
            </div>
            
            <div class="security-note">
                <h3>🛡️ Segurança</h3>
                <p>
                    Este link é válido por 1 hora e pode ser usado apenas uma vez. 
                    Se você não solicitou este acesso, ignore este email.
                </p>
            </div>
            
            <div class="divider"></div>
            
            <div class="features">
                <div class="feature">
                    <div class="feature-icon">⚡</div>
                    <h4>Acesso Rápido</h4>
                    <p>Login instantâneo sem senha</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔒</div>
                    <h4>100% Seguro</h4>
                    <p>Link único e temporário</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">📱</div>
                    <h4>Multi-dispositivo</h4>
                    <p>Funciona em qualquer aparelho</p>
                </div>
            </div>
            
            <div class="message">
                <strong>Problemas para acessar?</strong><br/>
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br/>
                <a href="{{ .ConfirmationURL }}" style="color: #10b981; word-break: break-all;">{{ .ConfirmationURL }}</a>
            </div>
        </div>
        
        <div class="footer">
            <p>
                Este email foi enviado automaticamente pela Plataforma Agroderi.<br/>
                Se você não solicitou este acesso, pode ignorar este email com segurança.
            </p>
            <p style="margin-top: 15px;">
                © 2024 Plataforma Agroderi. Todos os direitos reservados.
            </p>
        </div>
    </div>
</body>
</html>
```

### Assunto do Email:
```
🔐 Acesso Seguro - Plataforma Agroderi
```

## 3. Variáveis Disponíveis
- `{{ .ConfirmationURL }}` - URL do magic link
- `{{ .Email }}` - Email do usuário
- `{{ .SiteURL }}` - URL do site

## 4. Teste
Após configurar, teste enviando um magic link para verificar se o template está funcionando corretamente.

## 5. Personalização Adicional
Você pode personalizar ainda mais o template alterando:
- Cores (busque por `#10b981` e `#059669` para as cores principais)
- Textos
- Layout
- Ícones emoji
