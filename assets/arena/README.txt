GRAVITY / Moss Court — v9 battlefield art candidate

DELIVERABLE
arena_moss_court_480x538.png is the production-facing combined image:
480x538 RGB opaque, integer-pixel artwork, no baked units/UI/team labels.
Native file35KB approximately. nearest filtering; use same pixel scale as units.
arena_floor_only.png and arena_border_overlay.png are optional editable layers.
Do not draw the border twice if using the combined image.

ART DIRECTION
A flat, worn moss-and-earth mustering yard, enclosed only by an exterior apron
of weathered slate stone. Sparse connected grass marks, worn surface scuffs,
low-frequency patches and irregular bevel/chip/moss detail replace the old
uniform grid. Central area remains low contrast for units and projectiles.
No internal grid, dashed center divider, tactical ring, team-color field half,
loose standing boulders, pillars, bridges, loot, tall plants or painted hazards.
No automatic icon collage. Every surface/edge element is part of one palette
and one deterministic integer-pixel construction.

SPACE / COLLISION
Existing logical canvas480x538. Existing gameplay center bounds, inclusive:
x20..460, y20..518. Border overlay has ZERO nontransparent pixels inside this
rectangle, checked programmatically. All marks inside are flat passable ground.
The art adds no collision or traversal rules. Unit body/weapon overhang beyond
its center bounds is still a renderer/simulation concern, unchanged here.

INTEGRATION CONTRACT
Draw combined PNG at0,0,480,538 before ground effects, then units and aboveFX.
Remove old gradient fill, grid lines, center dashed line and baked side words.
Keep side/team labels as separate UI, not as floor pixels.
Use imageSmoothingEnabled=false. Apply the same camera transform as actors.
Do not stretch or tile the arena to invent a larger battlefield. Camera/pan
limits and all combat/economy rules remain owned by the existing application.
The previous seven new-event FX candidate is NOT included/adopted here.

PROVENANCE / VALIDATION
Original code-authored art. No third-party sprite, photo, font or generated
bitmap was used. No external runtime dependency. Build uses Python3+Pillow.
A previously saved v6.1 live-battle screenshot was read as an historical
appearance reference only; it was NOT the latest v8QA screen and is not
redistributed in this package. The current v8QA-based v9 candidate draw()
function was separately read for dimensions/palette/grid structure.
No new game/browser screenshot or render was attempted. Native and2x standalone
art images were visually inspected; integration/gameplay visual QA remains open.
Source game files and the published game are unchanged by this art work.

REGENERATE
python3 build_arena.py
JSON provides palette, bounds and combined-image SHA-256.
The source seed keeps texture placement reproducible.
