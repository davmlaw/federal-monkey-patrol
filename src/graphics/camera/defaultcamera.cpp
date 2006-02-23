// (C) David Lawrence released under the GPL (see license.txt)
// Started:       Thu Sep 22 13:41:55 2005

#include "defaultcamera.h"


DefaultCamera::DefaultCamera():
    position(0.0f, 0.0f, 0.0f),
    target(0.0f, 0.0f, 0.0f),
    up(0.0f, 1.0f, 0.0f)
{

}


DefaultCamera::~DefaultCamera()
{

}

void DefaultCamera::setPosTarg(const vector3& p, const vector3& t)
{
    position = p;
    target = t;
}

void DefaultCamera::setPosTargUp(const vector3& p,
				 const vector3& t,
				 const vector3& u)
{
    position = p;
    target = t;
    up = u;
}

