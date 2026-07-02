import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminTokens } from "./tokens";



function getGreeting(): string {

  const hour = new Date().getHours();

  if (hour < 12) return "Bom dia";

  if (hour < 18) return "Boa tarde";

  return "Boa noite";

}



interface AdminHeroProps {

  userName: string;

  title: string;

  description?: string;

  backHref?: string;

  backLabel?: string;

  actions?: React.ReactNode;

  sideContent?: React.ReactNode;

  className?: string;

}



export function AdminHero({

  userName,

  title,

  description,

  backHref,

  backLabel = "Voltar",

  actions,

  sideContent,

  className,

}: AdminHeroProps) {

  const firstName = userName.split(" ")[0] || userName;



  return (

    <section

      className={cn(

        adminTokens.hero,

        "relative -mx-3 mb-0 overflow-hidden px-3 py-5 sm:-mx-5 sm:px-5 sm:py-6 lg:-mx-8 lg:px-8 lg:py-7",

        className,

      )}

    >

      <div

        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_85%_-5%,rgba(16,185,129,0.1),transparent_55%),radial-gradient(ellipse_50%_40%_at_5%_100%,rgba(34,197,94,0.05),transparent_50%)]"

        aria-hidden

      />



      {backHref && (
        <Link
          href={backHref}
          className={cn(
            adminTokens.secondaryBtn,
            "relative mb-3 inline-flex h-7 items-center px-2.5 text-xs shadow-none backdrop-blur-sm",
          )}
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          {backLabel}
        </Link>
      )}



      <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-8">

        <div className="space-y-2">

          <p className="text-xs font-medium uppercase tracking-wider text-emerald-500/80">

            {getGreeting()}, {firstName}

          </p>

          <h1

            className={cn(

              adminTokens.title,

              "text-2xl font-semibold sm:text-3xl lg:text-[2rem] lg:leading-tight",

            )}

          >

            {title}

          </h1>

          {description && (

            <p className="max-w-xl text-sm leading-relaxed text-[#A5B3AC]">

              {description}

            </p>

          )}

          {actions && (

            <div className="flex flex-wrap items-center gap-2 pt-1">{actions}</div>

          )}

        </div>



        {sideContent && (

          <div className="min-w-0 lg:min-w-[300px] xl:min-w-[380px]">

            {sideContent}

          </div>

        )}

      </div>

    </section>

  );

}


