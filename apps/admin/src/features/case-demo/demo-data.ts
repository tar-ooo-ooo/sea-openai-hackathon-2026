export const demoCase = {
  name: "王○明",
  age: 76,
  cmsLevel: 5,
  stage: "A 單位照顧計畫擬定",
};

export const demoStats = [
  { label: "我的個案", value: "48", note: "進行中的個案" },
  { label: "今日需處理", value: "8", note: "含 3 件高優先" },
  { label: "新照會", value: "3", note: "等待開始接案" },
  { label: "待確認計畫", value: "2", note: "案家意願待確認" },
  { label: "服務待媒合", value: "1", note: "需安排服務單位" },
  { label: "異常事件", value: "1", note: "建議優先處理" },
];

export const demoInboxItems = [
  {
    title: "王○明・CMS 5・中風出院",
    detail: "新照會，尚未建立照顧計畫。",
    suggestion: "先檢視正式評估與家庭照顧狀況，開始擬定計畫。",
    action: "開始接案",
    href: "/cases/demo",
    priority: "high",
    kind: "referral",
    kindLabel: "新照會",
    time: "今天",
  },
  {
    title: "陳○華・居家服務需重新媒合",
    detail: "原服務單位回報目前無量能。",
    suggestion: "重新比對可服務區域與需求時段的單位。",
    action: "處理媒合",
    href: "/cases/demo/matching",
    priority: "medium",
    kind: "alert",
    kindLabel: "服務異常",
    time: "今天",
  },
  {
    title: "林○美・主要照顧者住院",
    detail: "家屬回報家庭照顧能力改變。",
    suggestion: "重新檢視 Care Plan，評估是否需要額外支持。",
    action: "查看異動",
    href: "/cases/demo/follow-up",
    priority: "high",
    kind: "review",
    kindLabel: "需求異動",
    time: "昨天",
  },
];

export const demoServices = [
  { name: "居家照顧", status: "服務中" },
  { name: "交通接送", status: "媒合中" },
  { name: "輔具評估", status: "待安排" },
  { name: "喘息服務", status: "尚未使用" },
];

export const demoRecommendations = [
  { name: "居家照顧", priority: "高優先", reason: "個案沐浴及移位需要協助，週間白天家庭照顧人力不足。", recommendation: "週一至週五上午安排服務。" },
  { name: "交通接送", priority: "高優先", reason: "個案每週需至醫療院所復健，現有家庭交通安排不足。", recommendation: "配合每週三回診／復健時段。" },
  { name: "輔具與居家無障礙", priority: "中優先", reason: "行動能力下降，浴室環境可能增加跌倒風險。", recommendation: "安排浴室扶手與移位輔具評估。" },
];
