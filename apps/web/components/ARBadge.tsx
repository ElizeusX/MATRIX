import { FurnitureIcon } from "./Brand";
import { getFurnitureModel } from "../lib/ar-models";

export default async function ARBadge({ slug }: { slug: string }) {
  const model = await getFurnitureModel(slug);
  if (!model?.enabled_ar || !model.usdz_url) return null;
  return (
    <span className="product-ar-badge">
      <FurnitureIcon kind="cube" />
      <span>3D / AR</span>
    </span>
  );
}
