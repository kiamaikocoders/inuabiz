import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { ScenePane } from "@/components/auth/ScenePane";
import type { AuthScene } from "@/lib/auth-scenes";

export function AuthSplit({
  children,
  scene,
}: {
  children: ReactNode;
  scene: AuthScene;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <ScenePane
        image={scene.image}
        imageAlt={scene.imageAlt}
        className="hidden min-h-screen p-12 lg:flex lg:flex-col lg:justify-between"
      >
        <Link to="/" className="w-fit">
          <Logo tone="inverted" />
        </Link>
        <div className="max-w-md">
          <h2 className="text-primary-foreground text-3xl font-bold leading-tight">
            “{scene.quote.replace(/^"|"$/g, "")}”
          </h2>
          <p className="text-primary-foreground/80 mt-4 leading-relaxed">{scene.body}</p>
          <p className="text-gold mt-6 text-sm font-semibold">{scene.byline}</p>
        </div>
        <p className="text-primary-foreground/55 text-xs leading-relaxed">{scene.caption}</p>
      </ScenePane>

      <div className="flex flex-col bg-background">
        <ScenePane image={scene.image} imageAlt={scene.imageAlt} className="h-40 p-5 lg:hidden">
          <Link to="/" className="w-fit">
            <Logo tone="inverted" />
          </Link>
        </ScenePane>
        <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-12">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
