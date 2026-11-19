// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Sep 22 15:09:46 2005
// This class basically delegates to a camera class (smooth, default, etc)

#ifndef CAMERAMAN_H
#define CAMERAMAN_H

#include "camera.h"
#include "graphics/3d/drawable.h"

/**
 * Moves a camera around
 * @see Camera
 */
class CameraMan {
public:
    CameraMan(Camera* cam);
    virtual ~CameraMan();
    Camera* getCamera(void) { return camera; };
    void lookAt(Drawable* d);
    void setCamera(Camera* c, int transitionSeconds = 0);
    void setFollowAbsoluteHeight(float h);
    void setFollowDistance(float d);
    void setFollowHeight(float h);
    void setLeadAhead(float a);
    void setLeadHeight(float h);
protected:
    Camera* camera;
    vector3 positionOffset;
    vector3 absolutePositionOffset;
    vector3 targetOffset;
private:
    // Explicitly disable compiler generated copy functions
    CameraMan(const CameraMan& rhs);
    CameraMan& operator=(const CameraMan& rhs);
};


#endif // CAMERAMAN_H
