#ifndef SKYSCRAPER_H
#define SKYSCRAPER_H
#include <iostream>
#include "mesh.h"

typedef struct {
    int x_windows;
    int y_windows;
    int z_windows;
} level_t;

class Skyscraper : public Mesh {
 private:
    GLint floors;
    vector<level_t> windows;
 public:
    Skyscraper(void): Mesh(), floors(0) { };
    ~Skyscraper(void) { };
    void load(GLfloat x, GLfloat y, GLfloat z);
    void draw(void);
};


Skyscraper *Skyscraper_Factory(GLfloat x, GLfloat y, GLfloat z);

#endif
