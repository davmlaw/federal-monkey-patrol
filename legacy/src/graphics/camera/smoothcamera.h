// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Sep 22 13:59:33 2005
// This smooths the camera motion. We smooth the difference of the target
// and position rather than target and position separately for nicer movement

#ifndef SMOOTHCAMERA_H
#define SMOOTHCAMERA_H

#include "camera.h"
#include "util/averager.h"

class SmoothCamera : public Camera {
public:
    SmoothCamera(unsigned int posSamplee = 5, unsigned int targSamples = 5);
    virtual ~SmoothCamera();
    virtual vector3 getPosition(void);
    virtual vector3 getTarget(void);
    virtual vector3 getUp(void);
    virtual void setPosTarg(const vector3& pos, const vector3& targ);
    virtual void setPosTargUp(const vector3& pos,
			      const vector3& targ,
			      const vector3& up);
protected:
    Averager<vector3> position;
    Averager<vector3> targetFromPos;
    vector3 up;
private:
    // Explicitly disable compiler generated copy functions
    SmoothCamera(const SmoothCamera& rhs);
    SmoothCamera& operator=(const SmoothCamera& rhs);


};

#endif // SMOOTHCAMERA_H
