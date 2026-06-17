import { notFound } from "next/navigation";
import { supabaseAdmin as supabase } from "@/lib/supabase-server";
import { formatPrice, calculateCurrentPrice } from "@/lib/pricing";
import BookingClient from "./BookingClient";
import { Metadata } from "next";

async function getService(id: string) {
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error) {
    console.error("Error fetching service:", error);
    return null;
  }
  return data;
}

async function getAvailableSlots(serviceId: string, date: string) {
  // Ensure we query using IST timezone bounds (UTC+5:30) so server environment UTC doesn't cause drift
  const startOfDay = new Date(`${date}T00:00:00+05:30`).toISOString();
  const endOfDay   = new Date(`${date}T23:59:59+05:30`).toISOString();

  const { data, error } = await supabase
    .from("slots")
    .select("*")
    .eq("service_id", serviceId)
    .eq("status", "available")
    .gte("start_time", startOfDay)
    .lte("start_time", endOfDay)
    .order("start_time");

  if (error) {
    console.error("Error fetching slots:", error);
    return [];
  }
  return data;
}

interface PageProps {
  params: Promise<{ service_id: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ service_id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const service = await getService(resolvedParams.service_id);
  
  if (!service) {
    return {
      title: "Service Not Found | RR Downtown Arcade",
      description: "The requested gaming service could not be found.",
    };
  }

  return {
    title: `Book ${service.name} | RR Downtown Arcade`,
    description: `Book your slot for ${service.name} at RR Downtown Arcade. Experience premium gaming with our top-tier setups.`,
    openGraph: {
      title: `Book ${service.name} | RR Downtown Arcade`,
      description: `Book your slot for ${service.name} at RR Downtown Arcade. Experience premium gaming with our top-tier setups.`,
      images: service.image_url ? [service.image_url] : undefined,
    }
  };
}

export default async function BookingPage({ params }: PageProps) {
  const { service_id } = await params;
  const service = await getService(service_id);

  if (!service) {
    notFound();
  }

  // Default to today's date in IST (Asia/Kolkata)
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const initialSlots = await getAvailableSlots(service_id, today);

  return (
    <BookingClient
      service={service}
      initialSlots={initialSlots}
      initialDate={today}
    />
  );
}