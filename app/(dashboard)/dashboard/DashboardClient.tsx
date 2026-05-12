"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DocumentManager, { type Doc } from "@/components/DocumentManager";
import ChatInterface from "@/components/ChatInterface";
import UsageBar from "@/components/UsageBar";
import CrossSellToast from "@/components/CrossSellToast";
import { useToast } from "@/components/Toast";
import type { PlanId } from "@/lib/plans";

interface Props {
  initialDocuments: Doc[];
  planId: PlanId;
  planLimit: number;
  planDocLimit: number;
  planMaxChars: number;
  initialUsage: number;
  subscriptionActive: boolean;
  hasOtherProduct: boolean;
  upgraded: boolean;
}

export default function DashboardClient(props: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Doc[]>(props.initialDocuments);
  const [usage, setUsage] = useState(props.initialUsage);

  useEffect(() => {
    if (props.upgraded) {
      toast({
        kind: "success",
        message: "Subscription active. Ask away.",
      });
      // Strip ?upgraded=true from the URL without reloading
      router.replace("/dashboard");
    }
  }, [props.upgraded, router, toast]);

  function handleUsageBumped(newCount: number) {
    setUsage(newCount);
  }

  return (
    <>
      {props.hasOtherProduct && (
        <CrossSellToast
          message="You already have HATE Meetings. Save ~25% by switching to the Everything Bundle."
          ctaHref="/upgrade"
          ctaLabel="See bundle"
          storageKey="cross_sell_toast_seen_meetings_v1"
        />
      )}
    <div className="flex-1 grid grid-cols-1 md:grid-cols-[35%_65%] min-h-0 overflow-hidden">
      {/* LEFT — Document Manager */}
      <section className="flex flex-col min-h-0 border-r border-line bg-bg border-t-[3px] border-t-acid shadow-acid-glow overflow-hidden">
        <DocumentManager
          documents={documents}
          onChange={setDocuments}
          planId={props.planId}
          planDocLimit={props.planDocLimit}
          planMaxChars={props.planMaxChars}
        />
      </section>

      {/* RIGHT — Chat */}
      <section className="flex flex-col min-h-0 bg-bg overflow-hidden">
        <UsageBar
          count={usage}
          limit={props.planLimit}
          plan={props.planId}
          subscriptionActive={props.subscriptionActive}
        />
        <ChatInterface
          documents={documents}
          subscriptionActive={props.subscriptionActive}
          usageCount={usage}
          usageLimit={props.planLimit}
          onUsageBump={handleUsageBumped}
        />
      </section>
    </div>
    </>
  );
}
