/**
 * Centralized GSAP plugin registration.
 *
 * Import this module (directly or transitively) before any GSAP code runs
 * to ensure plugins are registered exactly once.
 */

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
