import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import PropertyInquiryGate from "@/src/features/Property/components/PropertyInquiryGate";
import { readInquiryAccess, INQUIRY_ACCESS_COOKIE } from "@/src/lib/server/inquiry-access";
import PropertyDetailWrapper from "@/src/features/Property/components/PropertyDetailWrapper";
import projectsRaw from "@/src/data/miami-projects.json";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const project = (projectsRaw as any[]).find((p) => p.slug === slug);
  if (!project) {
    return {
      title: "Project Not Found | Miami New Development",
      description: "Explore Miami's best pre-construction condos and new developments.",
    };
  }
  return {
    title: `${project.name} | Miami New Development`,
    description: project.statusRemark || `Explore pricing, floor plans, and availability for ${project.name} in ${project.neighborhood}.`,
  };
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const project = projectsRaw.find((item) => item.slug === slug);
  if (!project) notFound();
  const cookieStore = await cookies();
  const access = readInquiryAccess(cookieStore.get(INQUIRY_ACCESS_COOKIE)?.value);
  if (!access) {
    return <PropertyInquiryGate name={project.name} />;
  }
  return <PropertyDetailWrapper slug={slug} name={project.name} expiresAt={access.expiresAt} />;
}
