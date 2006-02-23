// (C) David Lawrence released under the GPL (see license.txt)
// Started:       29 Jan 2005
// Last modified: 29 Jan 2005

#ifndef BLANK_H
#define BLANK_H

#include "game/gamecomponent.h"
#include "graphics/2d/drawable2d.h"
#include "graphics/display.h"

/**
 * GameComponent that draws a blank screen.
 */
class Blank : public GameComponent {
public:
    Blank();
    ~Blank();
    virtual std::string getName(void) { return "Blank"; };
    void setColor(GLfloat r, GLfloat g, GLfloat b);
protected:
    virtual void _load(void) { }; // empty
    virtual void _play(Uint32 msecs, Input* input, float alpha);
private:
    Drawable2D* background;
};

#endif // BLANK
