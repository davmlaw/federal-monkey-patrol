// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Mar  6 16:29:45 2005
// Last modified: Sun Mar  6 16:29:45 2005

#ifndef FLUX
#define FLUX

#include "util/util.h"

/**
 * Has a state between 0->1
 */
class Flux {
public:
    Flux(float s = 0.0f): state(s) { };
    virtual ~Flux() { };
    float getState(void) { return state; };
    void  setState(float s) {
	state = clamp<float>(0.0f, s, 1.0f);
    };
protected:
    float state;
};


#endif // FLUX
