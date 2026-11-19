// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Wed Mar 16 01:03:02 2005
// Last modified: Wed Mar 16 01:03:02 2005

#ifndef AICONTROLLER
#define AICONTROLLER

#include "entity.h"
#include "controller.h"

/**
 * Moves AI by acting like an input device.
 */
class AIController : public Controller {
public:
    AIController();
    virtual ~AIController();
    virtual void control(Entity* e, Uint32 msecs);
private:
};

#endif // AICONTROLLER
