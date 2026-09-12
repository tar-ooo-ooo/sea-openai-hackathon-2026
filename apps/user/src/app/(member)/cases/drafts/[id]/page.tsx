import CasesPanel from "../../_components/CasesPanel";

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <><p className="eyebrow">我的案件</p><h1>申請草稿詳細內容</h1><CasesPanel key={id} detail={{ id, kind: "draft" }} /></>;
}
