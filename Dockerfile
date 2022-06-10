FROM ubuntu:20.04

COPY ["target/release", "."]

# Run the web service on container startup.
CMD [ "./image-color-canvas-world" ]