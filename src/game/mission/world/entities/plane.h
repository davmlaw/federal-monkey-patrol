// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Mar 16 01:06:01 2005
// Last modified: Wed Mar 16 01:06:01 2005

#ifndef PLANE
#define PLANE

#include "entity.h"

/**
 * Plane entity
 */
class Plane : public Entity {
public:
    Plane(Drawable* d);
    virtual ~Plane();
    void _update(World& world, Uint32 msecs);
private:
    long reload_time;
};

#endif // PLANE
