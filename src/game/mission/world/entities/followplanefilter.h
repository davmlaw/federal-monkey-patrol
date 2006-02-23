// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Mar 20 21:55:05 2005
// Last modified: Sun Mar 20 21:55:05 2005

#ifndef FOLLOWPLANEFILTER
#define FOLLOWPLANEFILTER

#include "inputfiltercontroller.h"

/**
 * Moves plane when in "Follow" mode
 * @see TopDownPlaneFilter
 */
class FollowPlaneFilter : public InputFilterController {
public:
    FollowPlaneFilter();
    virtual ~FollowPlaneFilter();
    virtual void control(Entity* ent, Uint32 msecs);
protected:
    virtual void _read(Input& in);
private:
    vector3 axis;
    int firing;
};

#endif // FOLLOWPLANEFILTER
