// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Mar 16 00:42:56 2005

#ifndef ENTITY
#define ENTITY

#include "graphics/3d/drawable.h"
#include "controller.h"
#include "game/mission/world/world.h"
#include "util/mtxlib.h"

#define FRICTION 0.001f

/**
 * A thing in the game world
 */
class Entity {
public:
    Entity(Drawable* d);
    virtual ~Entity();
    void update(World& w, Uint32 msecs);
    void setController(Controller* c) { controller = c; };
    void setFiring(int f) { firing = f; };
    void setDead(void) { dead = true; };
    bool isDead(void) const { return dead; };
    Drawable* drawable;
    vector3 velocity;
protected:
    virtual void _update(World& w, Uint32 msecs) = 0;
    virtual float getFriction(void) { return FRICTION; };
    int firing;
    bool dead;
private:
    Controller* controller;
};

#endif // ENTITY
