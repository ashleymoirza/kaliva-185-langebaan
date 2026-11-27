import type { CSSProperties } from "react";
import type { SiteLayout } from "@/lib/builder/types";
import type { Property } from "@/lib/properties";
import { listActiveProperties } from "@/lib/properties-store";
import * as S from "@/components/blocks/sections";

export default async function BlockRenderer({ layout }: { layout: SiteLayout }) {
  const needsProperties = layout.blocks.some((b) => b.type === "featuredProperties" && b.visible);
  const properties: Property[] = needsProperties ? await listActiveProperties() : [];

  const themeStyle = {
    "--color-brand-600": layout.theme.primary,
    "--color-brand-700": layout.theme.primary,
  } as CSSProperties;

  return (
    <div style={themeStyle}>
      {layout.blocks
        .filter((b) => b.visible)
        .map((b) => {
          switch (b.type) {
            case "hero": return <S.HeroBlock key={b.id} props={b.props} />;
            case "featuredProperties": return <S.FeaturedPropertiesBlock key={b.id} props={b.props} properties={properties} />;
            case "highlights": return <S.HighlightsBlock key={b.id} props={b.props} />;
            case "featuredUnits": return <S.FeaturedUnitsBlock key={b.id} props={b.props} />;
            case "reviews": return <S.ReviewsBlock key={b.id} props={b.props} />;
            case "richText": return <S.RichTextBlock key={b.id} props={b.props} />;
            case "imageText": return <S.ImageTextBlock key={b.id} props={b.props} />;
            case "cta": return <S.CtaBlock key={b.id} props={b.props} />;
            case "faq": return <S.FaqBlock key={b.id} props={b.props} />;
            case "gallery": return <S.GalleryBlock key={b.id} props={b.props} />;
            case "mapContact": return <S.MapContactBlock key={b.id} props={b.props} />;
            default: return null;
          }
        })}
    </div>
  );
}
