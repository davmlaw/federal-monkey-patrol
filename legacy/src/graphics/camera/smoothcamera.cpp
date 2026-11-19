// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Sep 22 13:59:33 2005

#include "smoothcamera.h"

using namespace std;


SmoothCamera::SmoothCamera(unsigned int posSamples, unsigned int targSamples):
    position( posSamples ),
    targetFromPos( targSamples ),
    up( 0.0f, 1.0f, 0.0f )
{

}

SmoothCamera::~SmoothCamera()
{

}

vector3 SmoothCamera::getPosition(void)
{
    return position.getMean();
}

// Return to world coordinates from our storage of lead
vector3 SmoothCamera::getTarget(void)
{
    return getPosition() + targetFromPos.getMean();
}

vector3 SmoothCamera::getUp(void)
{
    return up;
}


void SmoothCamera::setPosTarg(const vector3& p, const vector3& t)
{
    position.add( p );
    targetFromPos.add( t - p );
}


void SmoothCamera::setPosTargUp(const vector3& p,
				const vector3& t,
				const vector3& u)
{
    setPosTarg(p,t);
    up = u;
}
