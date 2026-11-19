// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Mar 20 22:07:06 2005
// Last modified: Sun Mar 20 22:07:06 2005

#ifndef ENTITYDRAWER
#define ENTITYDRAWER

#include "entity.h"
#include "graphics/3d/drawable.h"
#include <list>

/**
 * A 3d drawable object which draws the list of entities
 */
class EntityDrawer : public Drawable {
public:
    EntityDrawer(std::list<Entity*>* el): entlist(el) { };
    virtual ~EntityDrawer() { };
    void representation(drawdetails_t& drawdetails);
    virtual Drawable* clone(void) const {
	return new EntityDrawer(*this);
    };
private:
    std::list<Entity*>* entlist;
};

#endif // ENTITYDRAWER
