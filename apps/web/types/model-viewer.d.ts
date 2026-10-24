import type {DetailedHTMLProps,HTMLAttributes} from "react";

declare module "react" {
 namespace JSX {
  interface IntrinsicElements {
   "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>,HTMLElement> & {
    src?:string;
    "ios-src"?:string;
    alt?:string;
    ar?:boolean;
    "ar-modes"?:string;
    "ar-placement"?:string;
    "ar-scale"?:string;
    "camera-controls"?:boolean;
    "interaction-prompt"?:string;
    "field-of-view"?:string;
    exposure?:string;
    "shadow-intensity"?:string;
    loading?:"lazy"|"eager"|"auto";
    reveal?:"auto"|"interaction"|"manual";
   }
  }
 }
}
