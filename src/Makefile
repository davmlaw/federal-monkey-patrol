BINARY	= ../kongtest
CC	= g++
CFLAGS	= -g -Wall `sdl-config --cflags`
LIBS	= -lGL -lGLU -lglut -lm `sdl-config --libs` /usr/lib/libode.a

OBJECTS	= main.o mtxlib.o mesh.o model.o model_obj.o util.o box.o entity.o graphics.o skyscraper.o street.o

all:	$(BINARY)

clean:
	rm -f $(OBJECTS)

$(BINARY):	$(OBJECTS)
	$(CC) *.o $(LIBS) -o $(BINARY)

.cpp.o:	kong.h $*.cpp $*.h
	$(CC) $(CFLAGS) -c $*.cpp
