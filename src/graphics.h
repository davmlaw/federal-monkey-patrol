#ifndef GRAPHICS_H
#define GRAPHICS_H

#include "drawable.h"
#include "entity.h"

int resizeWindow( int width, int height );
void initGL(void);
void drawGL(Entity *player, vector<Entity *> &floor,
	    vector<Entity *> &city, vector<Entity *> &entities);
void setFogCoord(float height);
bool isExtensionSupported(string ext);

#endif
