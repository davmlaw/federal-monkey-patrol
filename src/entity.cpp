#include "entity.h"


Entity::Entity(void)
{

    drawable = NULL;

    pos.x = 0.0;
    pos.y = 0.0;
    pos.z = 0.0;

    yaw = 0.0;
    pitch = 0.0;
    roll = 0.0;

}

void Entity::draw(void)
{

    glPushMatrix();
    glTranslatef( pos.x, pos.y, pos.z );
    glRotatef(yaw, 0, -1, 0);
    glRotatef(pitch, 1, 0, 0);
    glRotatef(roll, 0, 0, 1 );
    drawable->draw();
    glPopMatrix();

}
