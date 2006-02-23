// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Sep 22 15:09:46 2005

#include "cameraman.h"

using namespace std;


const float CAMERA_HEIGHT = 10.0f;
const float CAMERA_DIST   = 40.0f;

const float HIGH_ANGLE_HEIGHT   = 2200.0f;
const float HEIGHT_ANGLE_FACTOR = 0.06f;

const float LEAD_AHEAD = 20.0f;
const float LEAD_ABOVE = 10.0f;


CameraMan::CameraMan(Camera* cam):
    camera(cam),
    positionOffset(0.0f, 0.0f, 0.0f),
    absolutePositionOffset(0.0f, 0.0f, 0.0f),
    targetOffset(0.0f, 0.0f, 0.0f)
{
    setFollowHeight( CAMERA_HEIGHT );
    setFollowDistance( CAMERA_DIST );
    setLeadAhead( LEAD_AHEAD );
    setLeadHeight( LEAD_ABOVE );
}


CameraMan::~CameraMan()
{
    delete camera;
}


void CameraMan::lookAt(Drawable* d)
{
    matrix44 rotation = d->getRotMat();

    vector3 position = d->getPosition();
    position += absolutePositionOffset + rotation * positionOffset;

    vector3 target   = d->getPosition();
    target += rotation * targetOffset;
    camera->setPosTarg( position, target );
}


void CameraMan::setCamera(Camera* c, int transitionSecond)
{
    // FIXME: transition secs
    /*
    c->setPosTargUp( camera->getPosition(),
		     camera->getTarget(),
		     camera->getUp() );
    */

    delete camera;
    camera = c;
}

void CameraMan::setFollowAbsoluteHeight(float h)
{
    absolutePositionOffset.y = h;
}

void CameraMan::setFollowHeight(float h)
{
    positionOffset.y = h;
}

void CameraMan::setFollowDistance(float d)
{
    positionOffset.z = d;
}

void CameraMan::setLeadHeight(float h)
{
    targetOffset.y = h;
}

void CameraMan::setLeadAhead(float l)
{
    targetOffset.z = -l;
}

