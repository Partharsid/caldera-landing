import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatPrice } from "@/lib/pricing";
import RegisterClient from "./RegisterClient";

export const revalidate = 0;

async function getChampionship(id: string) {
  const { data, error } = await supabaseAdmin
    .from("championships")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

export default async function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const championship = await getChampionship(id);
  if (!championship) notFound();
  if (championship.status !== "open") return (
    <div className="dark min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-2">Registration Closed</h1>
        <p className="text-zinc-400 mb-4">This championship is not currently accepting registrations.</p>
        <a href={`/championships/${id}`} className="text-primary hover:underline">Back to championship</a>
      </div>
    </div>
  );
  if (championship.current_participants >= championship.max_participants) return (
    <div className="dark min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold mb-2">Championship Full</h1>
        <p className="text-zinc-400 mb-4">All spots have been filled. Check back for future tournaments.</p>
        <a href={`/championships/${id}`} className="text-primary hover:underline">Back to championship</a>
      </div>
    </div>
  );

  return (
    <div className="dark min-h-screen bg-transparent text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <a href={`/championships/${id}`} className="text-sm text-zinc-400 hover:text-white mb-6 inline-block">← Back to championship</a>
        <RegisterClient championship={championship} />
      </div>
    </div>
  );
}