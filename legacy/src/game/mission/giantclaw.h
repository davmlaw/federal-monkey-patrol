// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Jul  3 14:13:20 2005
// Last modified: Sun Jul  3 14:13:20 2005

#ifndef GIANTCLAW_H
#define GIANTCLAW_H

#include "util/mtxlib.h"
#include "util/flux.h"
#include "../../sdl_opengl.h"

/**
 * Intergalactic Space Buzzard
 */
class GiantClaw {
public:
    GiantClaw(float min_visible_height);
    virtual ~GiantClaw();
    float reachedPlayer(void) { return getState() >= 1.0f; };
    void  setInc(float i) { inc = i; };
    void  setDec(float d) { dec = d; };
    void  setHeightFactor(float h) { height_factor = h; };
    float getState(void) { return anger.getState(); };
    void  update(const vector3& playerPos, Uint32 msecs);
private:
    vector3 position;
    Flux anger;

    float min_visible_height;
    float inc;
    float dec;
    float height_factor;
    // Explicitly disable compiler generated copy functions
    GiantClaw(const GiantClaw& rhs);
    GiantClaw& operator=(const GiantClaw& rhs);
};

#endif // GIANTCLAW_H
