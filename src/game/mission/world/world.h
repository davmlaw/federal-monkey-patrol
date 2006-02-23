// (C) David Lawrence released under the GPL (see license.txt)
// Started:            ? 2003
// Last modified: 14 Apr 2004


#ifndef WORLD_H
#define WORLD_H

#include "entities/entity.h"
#include "graphics/3d/city/patchgridfactory.h"
#include "graphics/3d/drawable.h"
#include "graphics/3d/drawablecontainers.h"
#include "graphics/camera/camera.h"
#include "graphics/display.h"
#include "input/inputmanager.h"
#include "util/averager.h"
#include <list>

typedef std::list<Entity*> entlist_t;

class World {
public:
    World(void);
    ~World();
    void update(Uint32 msecs);
    void draw(Camera* camera);
    void addEntity(Entity* ent);
private:
    DrawableContainer background;
    DrawableContainer foreground;
    entlist_t entities;
    BoundedDrawable* city;
    Drawable* entity_drawer;
    Averager<Uint32> update_smoother;
};

#endif
