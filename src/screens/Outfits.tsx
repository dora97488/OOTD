import PageHeader from '../components/PageHeader';
import Placeholder from '../components/Placeholder';
export default function Outfits() {
  return (
    <>
      <PageHeader title="穿搭組合" />
      <Placeholder
        area="穿搭列表 / 建立"
        owner=""
        todo="列出已存 Outfit；點進可看單品與五行解析。資料用 data/ 的 listOutfits。建立頁見 /outfits/new。色系輔助（相似/跳色）可用 constants/colors 與單品 wuxing。"
        spec="規格 §5.3 / §6.3"
      />
    </>
  );
}
