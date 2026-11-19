// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Mar 16 01:05:57 2005
// Last modified: Wed Mar 16 01:05:57 2005

#ifndef MONKEY
#define MONKEY

#include "entity.h"

/**
 * Giant Monkey entity 
 */
class Monkey : public Entity {
public:
    Monkey(Drawable* d);
    virtual ~Monkey();
    void _update(World& world, Uint32 msecs);
private:
};

#endif // MONKEY
