import { Composition, Folder } from "remotion";
import { HelloWorld, myCompSchema } from "./HelloWorld";
import { Logo, myCompSchema2 } from "./HelloWorld/Logo";
import { FloxenPromoV2, FLOXEN_PROMO_V2_DURATION } from "./FloxenPromoV2";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Floxen">
        <Composition
          id="FloxenPromoV2"
          component={FloxenPromoV2}
          durationInFrames={FLOXEN_PROMO_V2_DURATION}
          fps={30}
          width={1920}
          height={1080}
        />
      </Folder>

      <Folder name="Examples">
        <Composition
          id="HelloWorld"
          component={HelloWorld}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
          schema={myCompSchema}
          defaultProps={{
            titleText: "Welcome to Remotion",
            titleColor: "#000000",
            logoColor1: "#91EAE4",
            logoColor2: "#86A8E7",
          }}
        />

        <Composition
          id="OnlyLogo"
          component={Logo}
          durationInFrames={150}
          fps={30}
          width={1920}
          height={1080}
          schema={myCompSchema2}
          defaultProps={{
            logoColor1: "#91dAE2" as const,
            logoColor2: "#86A8E7" as const,
          }}
        />
      </Folder>
    </>
  );
};
