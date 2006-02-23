// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Mar 20 23:39:40 2005
// Last modified: Sun Mar 20 23:39:40 2005

#ifndef INPUTFILTERCONTROLLER
#define INPUTFILTERCONTROLLER

#include "controller.h"
#include "input/inputfilter.h"

class InputFilterController : public InputFilter, public Controller {
public:
    InputFilterController() { };
    virtual ~InputFilterController() { };
    virtual void control(Entity* ent, Uint32 msecs) = 0;
protected:
    virtual void _read(Input& input) = 0;
};

#endif // INPUTFILTERCONTROLLER
