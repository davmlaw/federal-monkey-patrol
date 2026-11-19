// (C) 2003 David Lawrence released under the GPL (see license.txt)
// Started:       ?    ? 2004
// Last modified: 24 Sep 2004

#ifndef CAMERA_H
#define CAMERA_H

#include "util/mtxlib.h"

/**
 * Camera where players view is rendered from.
 * @see CameraMan
 */
class Camera {
public:
    Camera(void) { };
    virtual ~Camera() { };
    virtual vector3 getPosition(void) = 0;
    virtual vector3 getTarget(void)   = 0;
    virtual vector3 getUp(void)       = 0;

    // In order to properly smooth camera lead, you need to set
    // position and target at the same
    virtual void setPosTarg(const vector3& pos, const vector3& targ) = 0;
    virtual void setPosTargUp(const vector3& pos,
			      const vector3& targ,
			      const vector3& up) = 0;
};


#endif
