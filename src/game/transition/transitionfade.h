// (C) David Lawrence released under the GPL (see license.txt)
// Started:       15 Sep 2004
// Last modified: 15 Sep 2004
// More useless crap!

#ifndef TRANSITIONFADE_H
#define TRANSITIONFADE_H

#include <string>
#include "game/transition/transition.h"

/**
 * Fades between two GameComponent s
 */
class TransitionFade : public Transition {
    virtual void representation(GLfloat alpha);
    virtual std::string getName(void) { return "TransitionFade"; };
};

#endif // TRANSITIONFADE_H
