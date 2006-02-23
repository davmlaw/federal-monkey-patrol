// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun May  8 23:54:20 2005
// Last modified: Sun May  8 23:54:20 2005

#ifndef PROJECTILE
#define PROJECTILE

#include "entity.h"
#include <string>

typedef struct {
    Drawable* drawable_prototype; // cloned.
    int lifetime;
    int gravity;
    float air_resistance;
} projectile_t;


/**
 * Bullet/bomb etc.
 */
class Projectile : public Entity {
public:
    Projectile(projectile_t* v);
    virtual ~Projectile();
    void _update(World& world, Uint32 msecs);
    float getFriction(void) { return 0.0f; };
    void setLifetime(Uint32 msecs) { lifetime = msecs; };
private:
    projectile_t* values;
    int lifetime;
};

Projectile* Projectile_Factory(const std::string& type);


#endif // PROJECTILE
