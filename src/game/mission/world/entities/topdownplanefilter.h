// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Sun Mar 20 20:45:26 2005
// Last modified: Sun Mar 20 20:45:26 2005

#ifndef TOPDOWNPLANEFILTER
#define TOPDOWNPLANEFILTER

#include "inputfiltercontroller.h"

/**
 * Moves plane when in "Top Down" mode
 * @see FollowPlaneFilter
 */
class TopDownPlaneFilter : public InputFilterController {
public:
    TopDownPlaneFilter();
    virtual ~TopDownPlaneFilter();
    virtual void control(Entity* ent, Uint32 msecs);
protected:
    virtual void _read(Input& in);
private:
    vector3 axis;
    float left;
    float right;
    int firing;
};

#endif // TOPDOWNPLANEFILTER
