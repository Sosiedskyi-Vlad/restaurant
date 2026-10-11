with open('pom.xml', 'r') as f:
    content = f.read()

dep = """		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-cache</artifactId>
		</dependency>
		<dependency>
			<groupId>com.github.ben-manes.caffeine</groupId>
			<artifactId>caffeine</artifactId>
		</dependency>
	</dependencies>"""

content = content.replace("	</dependencies>", dep)

with open('pom.xml', 'w') as f:
    f.write(content)
