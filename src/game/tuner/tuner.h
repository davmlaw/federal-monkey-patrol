// (C) David Lawrence released under the GPL (see license.txt)
// Started:       08 Dec 2004
// Last modified: 08 Dec 2004

#ifndef TUNER_H
#define TUNER_H

#include <string>
#include "game/gamecomponent.h"
#include "game/tuner/menu/menu2d.h"
#include "graphics/2d/drawable2d.h"
#include "input/menufilter.h"

typedef std::vector<Drawable2D*> d2D_list_t;

/**
 * User interface to edit game settings
 */
class Tuner : public GameComponent, public Drawable2D {
public:
    Tuner();
    ~Tuner();
    virtual std::string getName(void) { return "Tuner"; };
protected:
    virtual void _load(void) { };
    virtual void _play(Uint32 msecs, Input* input, float alpha);
    virtual void representation(GLfloat alpha);
private:
    MenuFilter menu;
    GLfloat bgcolor[4];
    GLfloat textcolor[4];
    float titlefont;
    float bodyfont;
    Drawable2D* background;
    Drawable2D* title;
    Menu2D* box;
};


#endif
