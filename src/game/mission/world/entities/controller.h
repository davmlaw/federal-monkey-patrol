// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Mar 16 00:31:40 2005
// Last modified: Wed Mar 16 00:31:40 2005

#ifndef CONTROLLER
#define CONTROLLER

#include "../../../../sdl_opengl.h"

class Entity;

/**
 * Controls an entity
 */
class Controller {
public:
    Controller() { };
    virtual ~Controller() { };
    virtual void control(Entity* e, Uint32 msecs) = 0;
private:
};

#endif // CONTROLLER
