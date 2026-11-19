// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Sep 22 13:41:55 2005

#ifndef DEFAULTCAMERA_H
#define DEFAULTCAMERA_H

#include "camera.h"

/**
 * Default camera implementation
 */
class DefaultCamera : public Camera {
public:
    DefaultCamera();
    virtual ~DefaultCamera();
    vector3 getPosition(void) { return position; };
    vector3 getTarget(void) { return target; };
    vector3 getUp(void) { return up; };
    virtual void setPosTarg(const vector3& p, const vector3& t);
    virtual void setPosTargUp(const vector3& p,
			      const vector3& t,
			      const vector3& u);
protected:
    vector3 position;
    vector3 target;
    vector3 up;
private:
    // Explicitly disable compiler generated copy functions
    DefaultCamera(const DefaultCamera& rhs);
    DefaultCamera& operator=(const DefaultCamera& rhs);
};



#endif // DEFAULTCAMERA_H
