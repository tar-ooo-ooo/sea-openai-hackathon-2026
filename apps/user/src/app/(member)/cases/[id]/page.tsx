import CasesPanel from "../_components/CasesPanel";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><p className="eyebrow">我的案件</p><h1>案件詳細內容</h1><CasesPanel key={id} detail={{ id, kind: "case" }} /></>;
}
