# Fixed lamp bodies, animated fire and light

This GIF uses only the original tavern painting. Every frame starts from that full image. The lanterns, chains, candle bodies, furniture and architecture stay in place. Four lamps change emitted light locally, three candle flames change within their original flame areas, and the fireplace flame moves within the original firebox. Nearby existing reflections vary with the corresponding light source.

There are no extracted lantern sprites, replacement backgrounds, repair plates, flame atlases or lamp-body transforms. The original high-resolution PNG remains unchanged as the static fallback.

- Original PNG SHA-256: `43fbeb1f07efc3c8bda997c7b28f3b02c5f7284d394ae984209bba630788d7aa`
- Fixed-light GIF SHA-256: `f194872040aa40216e601203501b678380f3f5fa72fd3f3e58f8f02e8acad084`
- 640 × 960; 256 colors; 24 frames at 10 fps; 2.4-second infinite loop; 992,844 bytes.

All 24 rendered source frames were checked in enlarged contact sheets. A complete loop was also captured from the actual browser-rendered home screen and reviewed alongside the GIF. Lamp chains and sampled unaffected window, banner, book and floor regions remain identical to the scaled original. The area surrounding the three hanging lamps differs from the original by at most 4/255 per RGB channel, as illumination only. The tabletop reflection has a larger, local change.

The runtime controller and layout are unchanged. Browser playback, stop to the original PNG, resume and title/button geometry were checked; existing fallback regression tests passed. These are home-screen checks, not a full game or SDK QA pass. Physical iPhone/GRAVITY performance, memory, battery and thermal costs have not been measured. The GIF is downscaled and palette-converted, so pixel identity with the high-resolution original is not claimed.
