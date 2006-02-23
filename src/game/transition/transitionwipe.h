// (C) David Lawrence released under the GPL (see license.txt)
// Started:       15 Sep 2004
// Last modified: 15 Sep 2004
// More useless crap!

#ifndef TRANSITIONWIPE_H
#define TRANSITIONWIPE_H

#include <string>
#include "game/transition/transition.h"

/**
 * Wipes between two GameComponent s
 */
class TransitionWipe : public Transition {
public:
    virtual void representation(GLfloat alpha);
    virtual std::string getName(void) { return "TransitionWipe"; };
protected:
    virtual void renderMask(void) = 0;
    virtual void renderColor(void) = 0;
};

/**
 * Wipes with a supplied angle
 */
class TransitionAngleWipe : public TransitionWipe {
public:
    TransitionAngleWipe(GLfloat a): angle(a) { };
    virtual std::string getName(void) { return "TransitionAngleWipe"; };
protected:
    virtual void renderMask(void);
    virtual void renderColor(void) { }; // nothing
private:
    GLfloat angle;
};

/**
 * Fancy Wipe
 */
class TransitionStarWipe : public TransitionWipe {
public:
    virtual std::string getName(void) { return "TransitionStarWipe"; };
protected:
    virtual void renderMask(void);
    virtual void renderColor(void);
private:
    void render_star(GLenum primitive);
};

/**
 * Wipes in a clockwise sweep
 */
class TransitionSpin : public TransitionWipe {
public:
    virtual std::string getName(void) { return "TransitionSpin"; };
protected:
    virtual void renderMask(void);
    virtual void renderColor(void) { }; // nothing
};


#endif // TRANSITION_WIPE_H
